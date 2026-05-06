import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Thumb } from '../components/Lightbox.jsx';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setBatches(await api.batches()); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('确认删除该批次及其所有题目和复习记录？')) return;
    await api.deleteBatch(id);
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">所有批次</h1>
        <Link to="/add" className="btn-primary">+ 新建批次</Link>
      </div>
      {loading ? (
        <p className="text-gray-400">加载中…</p>
      ) : batches.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          还没有批次，<Link to="/add" className="text-indigo-600 underline">去录入</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {batches.map(b => (
            <div key={b.id} className="card p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start gap-2">
                <Link to={`/batches/${b.id}`} className="font-semibold hover:text-indigo-600 break-words flex-1">
                  {b.title}
                </Link>
                <button className="btn-danger text-xs" onClick={() => handleDelete(b.id)}>删除</button>
              </div>
              {b.image_path && (
                <Link to={`/batches/${b.id}`}>
                  <Thumb src={b.image_path} size="h-24" className="mt-2 w-full" />
                </Link>
              )}
              <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                <span>📅 {b.study_date}</span>
                <span>📝 {b.item_count} 题</span>
                <span>✓ {b.done_count}/{b.total_count}</span>
                {b.source && <span>📚 {b.source}</span>}
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500"
                  style={{ width: `${b.total_count ? (b.done_count / b.total_count * 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
