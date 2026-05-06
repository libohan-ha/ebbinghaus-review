import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import Lightbox, { Thumb } from '../components/Lightbox.jsx';

export default function BatchDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  const load = () => api.batch(id).then(setData);
  useEffect(() => { load(); }, [id]);

  const [preview, setPreview] = useState(null);
  if (!data) return <p className="text-gray-400">加载中…</p>;
  const { batch, items, reviews } = data;

  const batchReviews = reviews.filter(r => r.target_type === 'batch');
  const itemReviewsByItem = {};
  for (const r of reviews.filter(r => r.target_type === 'item')) {
    (itemReviewsByItem[r.target_id] = itemReviewsByItem[r.target_id] || []).push(r);
  }

  return (
    <div className="space-y-4">
      <Link to="/batches" className="text-sm text-indigo-600">← 返回列表</Link>
      <div className="card p-5">
        <h1 className="text-2xl font-bold">{batch.title}</h1>
        <div className="text-sm text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>📅 做于 {batch.study_date}</span>
          {batch.source && <span>📚 {batch.source}</span>}
          <span>📝 {items.length} 题</span>
        </div>
        {batch.note && <p className="text-sm text-gray-600 mt-2">{batch.note}</p>}
        {batch.image_path && (
          <Thumb src={batch.image_path} size="max-h-72" className="mt-3 w-auto" onClick={() => setPreview(batch.image_path)} />
        )}
      </div>

      {batchReviews.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">批次复习计划</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {batchReviews.sort((a, b) => a.stage - b.stage).map(r => (
              <div key={r.id} className={`rounded-lg p-2 text-center text-xs border ${
                r.status === 'done' ? 'bg-green-50 border-green-200 text-green-700' :
                r.status === 'postponed' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="font-semibold">第 {r.stage + 1} 次</div>
                <div className="mt-0.5">{r.scheduled_date}</div>
                <div className="mt-0.5 text-[10px]">
                  {r.status === 'done' ? `✓${r.feedback ? ' '+r.feedback : ''}` : r.status === 'postponed' ? '推迟' : '待复习'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold mb-3">题目（{items.length}）</h2>
          <ol className="space-y-3">
            {items.map((it, idx) => (
              <li key={it.id} className="flex gap-3 text-sm">
                <span className="text-gray-400 shrink-0">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  {it.image_path && (
                    <Thumb src={it.image_path} size="max-h-48" className="mb-1 w-auto" onClick={() => setPreview(it.image_path)} />
                  )}
                  {it.content && <span className="break-words whitespace-pre-wrap">{it.content}</span>}
                  {it.tag && <span className="ml-2 pill bg-gray-100 text-gray-600">#{it.tag}</span>}
                  {itemReviewsByItem[it.id] && (
                    <span className="ml-2 text-xs text-gray-400">
                      （{itemReviewsByItem[it.id].filter(r => r.status === 'done').length}/{itemReviewsByItem[it.id].length}）
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      <Lightbox src={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
