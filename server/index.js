import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { buildReviewPlan, nextAfter, todayStr, addDays, OFFSETS } from './schedule.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 8) || '.png';
    const name = crypto.randomBytes(12).toString('hex') + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('only images allowed'));
    cb(null, true);
  }
});

// ---------- Upload ----------
app.post('/api/upload', upload.array('files', 30), (req, res) => {
  const paths = (req.files || []).map(f => `/uploads/${f.filename}`);
  res.json({ paths });
});

// ---------- Helpers ----------
function getTargetMeta(type, id) {
  if (type === 'batch') {
    return db.prepare('SELECT id, title, source, study_date, image_path FROM batches WHERE id = ?').get(id);
  }
  return db.prepare(`
    SELECT i.id, i.content, i.tag, i.image_path, i.batch_id, b.title AS batch_title, b.study_date
    FROM items i JOIN batches b ON b.id = i.batch_id WHERE i.id = ?
  `).get(id);
}

function enrichReview(r) {
  const meta = getTargetMeta(r.target_type, r.target_id);
  return { ...r, target: meta };
}

// ---------- Batches ----------
app.post('/api/batches', (req, res) => {
  const { title, source, note, study_date, items, track_each } = req.body;
  if (!title || !study_date) return res.status(400).json({ error: 'title 和 study_date 必填' });

  const tx = db.transaction(() => {
    const info = db.prepare(
      'INSERT INTO batches (title, source, note, study_date, image_path) VALUES (?, ?, ?, ?, ?)'
    ).run(title, source || null, note || null, study_date, req.body.image_path || null);
    const batchId = info.lastInsertRowid;

    const itemIds = [];
    if (Array.isArray(items)) {
      const stmt = db.prepare('INSERT INTO items (batch_id, content, tag, image_path) VALUES (?, ?, ?, ?)');
      for (const it of items) {
        const content = (it.content || '').trim();
        const image = it.image_path || null;
        if (!content && !image) continue; // 跳过空题
        const r = stmt.run(batchId, content, it.tag || null, image);
        itemIds.push(r.lastInsertRowid);
      }
    }

    // 生成复习计划：track_each 与 batch 二选一，避免重复
    // - track_each=true 且有题目 -> 只为每题生成
    // - 否则 -> 为批次整体生成
    const insertReview = db.prepare(`
      INSERT INTO reviews (target_type, target_id, scheduled_date, offset_day, stage)
      VALUES (?, ?, ?, ?, ?)
    `);
    if (track_each && itemIds.length > 0) {
      for (const itemId of itemIds) {
        for (const p of buildReviewPlan('item', itemId, study_date)) {
          insertReview.run(p.target_type, p.target_id, p.scheduled_date, p.offset_day, p.stage);
        }
      }
    } else {
      for (const p of buildReviewPlan('batch', batchId, study_date)) {
        insertReview.run(p.target_type, p.target_id, p.scheduled_date, p.offset_day, p.stage);
      }
    }

    return batchId;
  });

  const id = tx();
  res.json({ id });
});

app.get('/api/batches', (req, res) => {
  const rows = db.prepare(`
    SELECT b.*, 
      (SELECT COUNT(*) FROM items i WHERE i.batch_id = b.id) AS item_count,
      (SELECT COUNT(*) FROM reviews r WHERE r.target_type='batch' AND r.target_id=b.id AND r.status='done') AS done_count,
      (SELECT COUNT(*) FROM reviews r WHERE r.target_type='batch' AND r.target_id=b.id) AS total_count
    FROM batches b
    ORDER BY b.study_date DESC, b.id DESC
  `).all();
  res.json(rows);
});

app.get('/api/batches/:id', (req, res) => {
  const id = Number(req.params.id);
  const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(id);
  if (!batch) return res.status(404).json({ error: 'not found' });
  const items = db.prepare('SELECT * FROM items WHERE batch_id = ? ORDER BY id').all(id);
  const reviews = db.prepare(`
    SELECT * FROM reviews 
    WHERE (target_type='batch' AND target_id=?) 
       OR (target_type='item' AND target_id IN (SELECT id FROM items WHERE batch_id=?))
    ORDER BY scheduled_date, stage
  `).all(id, id);
  res.json({ batch, items, reviews });
});

app.delete('/api/batches/:id', (req, res) => {
  const id = Number(req.params.id);
  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM reviews WHERE 
      (target_type='batch' AND target_id=?) OR 
      (target_type='item' AND target_id IN (SELECT id FROM items WHERE batch_id=?))`).run(id, id);
    db.prepare('DELETE FROM batches WHERE id = ?').run(id);
  });
  tx();
  res.json({ ok: true });
});

// ---------- Today / Date ----------
// 返回某天应复习项；包含「过期未完成」（仅在 today 视图）
app.get('/api/reviews/today', (req, res) => {
  const today = req.query.date || todayStr();
  const rows = db.prepare(`
    SELECT * FROM reviews
    WHERE status IN ('pending','postponed') AND scheduled_date <= ?
    ORDER BY scheduled_date ASC, stage ASC
  `).all(today);
  res.json(rows.map(enrichReview));
});

app.get('/api/reviews/by-date', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date required' });
  const rows = db.prepare(`
    SELECT * FROM reviews WHERE scheduled_date = ? ORDER BY stage
  `).all(date);
  res.json(rows.map(enrichReview));
});

// 月视图：返回每天的统计
app.get('/api/reviews/month', (req, res) => {
  const { year, month } = req.query; // month 1-12
  if (!year || !month) return res.status(400).json({ error: 'year/month required' });
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01`;
  const end = `${year}-${m}-31`;
  const rows = db.prepare(`
    SELECT scheduled_date AS date,
      SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) AS done,
      SUM(CASE WHEN status IN ('pending','postponed') THEN 1 ELSE 0 END) AS pending,
      COUNT(*) AS total
    FROM reviews
    WHERE scheduled_date BETWEEN ? AND ?
    GROUP BY scheduled_date
  `).all(start, end);
  res.json(rows);
});

// ---------- 完成 / 反馈 / 推迟 ----------
app.post('/api/reviews/:id/complete', (req, res) => {
  const id = Number(req.params.id);
  const { feedback = null } = req.body || {}; // 'easy' | 'normal' | 'forgot' | null
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!r) return res.status(404).json({ error: 'not found' });

  const meta = getTargetMeta(r.target_type, r.target_id);
  if (!meta) return res.status(404).json({ error: 'target missing' });

  const tx = db.transaction(() => {
    db.prepare(`UPDATE reviews SET status='done', feedback=?, completed_at=datetime('now','localtime') WHERE id=?`)
      .run(feedback, id);

    if (feedback === 'forgot') {
      // 删除该 target 之后所有未完成节点，重新从 stage 1 生成
      db.prepare(`DELETE FROM reviews 
        WHERE target_type=? AND target_id=? AND status IN ('pending','postponed') AND id != ?`)
        .run(r.target_type, r.target_id, id);
      // 以「今天」作为新的起点，重排后续 6 个节点（1,3,7,15,30,60,90）
      const newStart = todayStr();
      const insertReview = db.prepare(`
        INSERT INTO reviews (target_type, target_id, scheduled_date, offset_day, stage)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (let i = 1; i < OFFSETS.length; i++) {
        insertReview.run(r.target_type, r.target_id, addDays(newStart, OFFSETS[i]), OFFSETS[i], i);
      }
    }
  });
  tx();
  res.json({ ok: true });
});

app.post('/api/reviews/:id/postpone', (req, res) => {
  const id = Number(req.params.id);
  const r = db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
  if (!r) return res.status(404).json({ error: 'not found' });
  const newDate = addDays(r.scheduled_date < todayStr() ? todayStr() : r.scheduled_date, 1);
  db.prepare(`UPDATE reviews SET scheduled_date=?, status='postponed' WHERE id=?`).run(newDate, id);
  res.json({ ok: true, scheduled_date: newDate });
});

app.post('/api/reviews/:id/reset', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`UPDATE reviews SET status='pending', feedback=NULL, completed_at=NULL WHERE id=?`).run(id);
  res.json({ ok: true });
});

// ---------- 统计 ----------
app.get('/api/stats', (req, res) => {
  const today = todayStr();
  const overdue = db.prepare(`SELECT COUNT(*) AS c FROM reviews WHERE status IN ('pending','postponed') AND scheduled_date < ?`).get(today).c;
  const todayCount = db.prepare(`SELECT COUNT(*) AS c FROM reviews WHERE status IN ('pending','postponed') AND scheduled_date = ?`).get(today).c;
  const totalBatches = db.prepare(`SELECT COUNT(*) AS c FROM batches`).get().c;
  const totalDone = db.prepare(`SELECT COUNT(*) AS c FROM reviews WHERE status='done'`).get().c;
  res.json({ overdue, today: todayCount, totalBatches, totalDone });
});

const PORT = process.env.PORT || 5174;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server: http://localhost:${PORT}  (LAN access enabled)`);
});
