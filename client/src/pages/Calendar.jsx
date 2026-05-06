import React, { useEffect, useMemo, useState } from 'react';
import { api, todayStr } from '../api.js';

function pad(n) { return String(n).padStart(2, '0'); }

export default function Calendar() {
  const today = todayStr();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [stats, setStats] = useState([]);
  const [selected, setSelected] = useState(today);
  const [detail, setDetail] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    api.month(year, month).then(setStats).catch(() => setStats([]));
  }, [year, month]);

  useEffect(() => {
    if (!selected) return;
    setLoadingDetail(true);
    api.byDate(selected).then(setDetail).finally(() => setLoadingDetail(false));
  }, [selected]);

  const statMap = useMemo(() => {
    const m = {};
    for (const s of stats) m[s.date] = s;
    return m;
  }, [stats]);

  // 构造网格
  const firstDay = new Date(year, month - 1, 1);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const goPrev = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  // 按 study_date 分组详情
  const groups = {};
  for (const r of detail) {
    const k = r.target?.study_date || '?';
    (groups[k] = groups[k] || []).push(r);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">复习日历</h1>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button className="btn-ghost" onClick={goPrev}>← 上月</button>
          <h2 className="font-semibold text-lg">{year} 年 {month} 月</h2>
          <button className="btn-ghost" onClick={goNext}>下月 →</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
          {['日','一','二','三','四','五','六'].map(w => <div key={w} className="py-1">{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const date = `${year}-${pad(month)}-${pad(d)}`;
            const s = statMap[date];
            const isToday = date === today;
            const isSelected = date === selected;
            const pending = s?.pending || 0;
            const done = s?.done || 0;
            return (
              <button key={i} onClick={() => setSelected(date)}
                className={`relative aspect-square rounded-lg border text-sm flex flex-col items-center justify-center transition
                  ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' :
                    isToday ? 'bg-indigo-50 border-indigo-300 text-indigo-700' :
                    'bg-white border-gray-100 hover:border-indigo-300'}`}>
                <span className="font-medium">{d}</span>
                <div className="flex gap-0.5 mt-0.5 h-2">
                  {pending > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-orange-400'}`} title={`待复习 ${pending}`} />}
                  {done > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-green-400'}`} title={`已完成 ${done}`} />}
                </div>
                {pending > 0 && (
                  <span className={`absolute top-0.5 right-1 text-[10px] ${isSelected ? 'text-white' : 'text-orange-500'}`}>{pending}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 text-xs text-gray-500">
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400 mr-1" />待复习</span>
          <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1" />已完成</span>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-semibold mb-3">{selected} 详情</h2>
        {loadingDetail ? (
          <p className="text-gray-400 text-sm">加载中…</p>
        ) : detail.length === 0 ? (
          <p className="text-gray-400 text-sm">这天没有复习安排</p>
        ) : (
          <div className="space-y-3">
            {Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => (
              <div key={date}>
                <p className="text-xs font-semibold text-gray-500 mb-1">📅 做于 {date} · {groups[date].length} 项</p>
                <ul className="space-y-1">
                  {groups[date].map(r => (
                    <li key={r.id} className="flex items-start gap-2 text-sm">
                      <span className={`pill shrink-0 ${
                        r.status === 'done' ? 'bg-green-100 text-green-700' :
                        r.status === 'postponed' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {r.status === 'done' ? '✓' : r.status === 'postponed' ? '推迟' : '待复习'}
                      </span>
                      <span className="flex-1 break-words">
                        {r.target_type === 'item'
                          ? <>{r.target?.content} <span className="text-gray-400 text-xs">@ {r.target?.batch_title}</span></>
                          : r.target?.title}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0">第 {r.stage + 1} 次</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
