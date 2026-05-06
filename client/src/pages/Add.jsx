import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, todayStr } from '../api.js';

export default function Add() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [studyDate, setStudyDate] = useState(todayStr());
  const [trackEach, setTrackEach] = useState(false);
  const [itemsText, setItemsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('请填写批次标题');
    setSubmitting(true);
    try {
      const items = itemsText.split('\n').map(s => s.trim()).filter(Boolean).map(content => ({ content }));
      const { id } = await api.createBatch({
        title: title.trim(),
        source: source.trim() || null,
        note: note.trim() || null,
        study_date: studyDate,
        items,
        track_each: trackEach,
      });
      nav(`/batches/${id}`);
    } catch (e) {
      alert('保存失败：' + e.message);
    } finally { setSubmitting(false); }
  };

  const itemCount = itemsText.split('\n').filter(s => s.trim()).length;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">录入新批次</h1>
      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">批次标题 *</label>
          <input className="input" placeholder="如：数学第三章 选择题" value={title}
            onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">做题日期 *</label>
            <input type="date" className="input" value={studyDate}
              onChange={e => setStudyDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">来源</label>
            <input className="input" placeholder="如：肖秀荣 / 真题" value={source}
              onChange={e => setSource(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <input className="input" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            题目列表 <span className="text-gray-400 font-normal">（每行一题，可选）· 当前 {itemCount} 题</span>
          </label>
          <textarea className="input min-h-[160px] font-mono text-[13px]"
            placeholder="第1题 …&#10;第2题 …&#10;…"
            value={itemsText} onChange={e => setItemsText(e.target.value)} />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" className="rounded mt-0.5" checked={trackEach}
            onChange={e => setTrackEach(e.target.checked)} />
          <span>
            <b>独立追踪每题</b>
            <span className="text-gray-400 ml-1">勾选后每题会单独生成复习计划，否则只整批一起复习</span>
          </span>
        </label>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? '保存中…' : '保存并生成复习计划'}
          </button>
          <button type="button" className="btn-ghost" onClick={() => nav(-1)}>取消</button>
        </div>
        <p className="text-xs text-gray-400">
          复习节点：当天 + 1, 2, 4, 7, 15, 30 天，共 7 次
        </p>
      </form>
    </div>
  );
}
