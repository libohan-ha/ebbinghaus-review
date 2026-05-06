import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, todayStr, diffDays } from '../api.js';
import Lightbox, { Thumb } from '../components/Lightbox.jsx';

const stageLabel = (offset) => offset === 0 ? '当天' : `${offset}天后`;

export default function Today() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackMode, setFeedbackMode] = useState(false);
  const today = todayStr();

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.today();
      setReviews(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleComplete = async (id, fb = null) => {
    await api.complete(id, fb);
    await load();
  };
  const handlePostpone = async (id) => {
    await api.postpone(id);
    await load();
  };

  // 按「做题日期」分组
  const groups = {};
  for (const r of reviews) {
    const key = r.target?.study_date || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  }
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const [preview, setPreview] = useState(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">今日复习</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today} · 共 <b className="text-indigo-600">{reviews.length}</b> 项{
            reviews.some(r => r.scheduled_date < today) && <span className="ml-2 text-red-500">（含逾期）</span>
          }</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={feedbackMode} onChange={e => setFeedbackMode(e.target.checked)}
            className="rounded" />
          三档反馈模式
        </label>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">加载中…</div>
      ) : reviews.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-gray-600">今日无待复习项，去 <Link to="/add" className="text-indigo-600 underline">录入新题</Link> 吧</p>
        </div>
      ) : (
        sortedKeys.map(date => (
          <section key={date} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500 px-1">
              📅 做于 {date} <span className="text-gray-400 font-normal">（{diffDays(date, today)} 天前）</span>
              <span className="ml-2 text-gray-400 font-normal">· {groups[date].length} 项</span>
            </h2>
            <div className="space-y-2">
              {groups[date].map(r => (
                <ReviewCard key={r.id} r={r} today={today}
                  feedbackMode={feedbackMode}
                  onComplete={handleComplete}
                  onPostpone={handlePostpone}
                  onPreview={setPreview} />
              ))}
            </div>
          </section>
        ))
      )}
      <Lightbox src={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function ReviewCard({ r, today, feedbackMode, onComplete, onPostpone, onPreview }) {
  const overdue = r.scheduled_date < today;
  const t = r.target || {};
  const isItem = r.target_type === 'item';
  return (
    <div className={`card p-4 ${overdue ? 'ring-1 ring-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`pill ${isItem ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {isItem ? '单题' : '批次'}
            </span>
            <span className="pill bg-gray-100 text-gray-600">第 {r.stage + 1} 次 · {stageLabel(r.offset_day)}</span>
            {overdue && <span className="pill bg-red-100 text-red-600">逾期</span>}
            {r.status === 'postponed' && <span className="pill bg-amber-100 text-amber-700">已推迟</span>}
          </div>
          {isItem ? (
            <>
              {t.image_path && (
                <Thumb src={t.image_path} size="max-h-64" className="mb-2 w-auto" onClick={() => onPreview(t.image_path)} />
              )}
              {t.content && <p className="font-medium break-words whitespace-pre-wrap">{t.content}</p>}
              {!t.content && !t.image_path && <p className="text-gray-400 italic">（无内容）</p>}
              <p className="text-xs text-gray-400 mt-1">
                来自批次：<Link to={`/batches/${t.batch_id}`} className="text-indigo-600 hover:underline">{t.batch_title}</Link>
                {t.tag && <span className="ml-2">#{t.tag}</span>}
              </p>
            </>
          ) : (
            <>
              {t.image_path && (
                <Thumb src={t.image_path} size="max-h-64" className="mb-2 w-auto" onClick={() => onPreview(t.image_path)} />
              )}
              <p className="font-medium">
                <Link to={`/batches/${t.id}`} className="hover:text-indigo-600">{t.title}</Link>
              </p>
              {t.source && <p className="text-xs text-gray-400 mt-1">来源：{t.source}</p>}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {feedbackMode ? (
            <>
              <button className="btn bg-green-100 text-green-700 hover:bg-green-200" onClick={() => onComplete(r.id, 'easy')}>熟练</button>
              <button className="btn bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => onComplete(r.id, 'normal')}>一般</button>
              <button className="btn bg-orange-100 text-orange-700 hover:bg-orange-200" onClick={() => onComplete(r.id, 'forgot')}>遗忘</button>
            </>
          ) : (
            <button className="btn-primary" onClick={() => onComplete(r.id, null)}>✓ 完成</button>
          )}
          <button className="btn-ghost" onClick={() => onPostpone(r.id)}>推迟</button>
        </div>
      </div>
    </div>
  );
}
