import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Link } from 'react-router-dom';
import Today from './pages/Today.jsx';
import Add from './pages/Add.jsx';
import Calendar from './pages/Calendar.jsx';
import Batches from './pages/Batches.jsx';
import BatchDetail from './pages/BatchDetail.jsx';
import { api } from './api.js';

export default function App() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  const navItem = ({ isActive }) =>
    `flex-1 sm:flex-none px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="font-bold text-lg text-indigo-600 shrink-0">📚 艾宾浩斯</Link>
          <nav className="flex gap-1 flex-1 sm:flex-none justify-end">
            <NavLink to="/" end className={navItem}>今日</NavLink>
            <NavLink to="/calendar" className={navItem}>日历</NavLink>
            <NavLink to="/batches" className={navItem}>批次</NavLink>
            <NavLink to="/add" className={navItem}>录入</NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 pb-24">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/batches/:id" element={<BatchDetail />} />
          <Route path="/add" element={<Add />} />
        </Routes>
      </main>

      {stats && (
        <footer className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t border-gray-100 sm:hidden">
          <div className="max-w-5xl mx-auto px-4 py-2 flex justify-around text-xs text-gray-500">
            <span>今日 <b className="text-indigo-600">{stats.today}</b></span>
            <span>逾期 <b className="text-red-500">{stats.overdue}</b></span>
            <span>批次 <b>{stats.totalBatches}</b></span>
            <span>已完成 <b>{stats.totalDone}</b></span>
          </div>
        </footer>
      )}
    </div>
  );
}
