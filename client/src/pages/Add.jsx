import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, todayStr } from '../api.js';
import ImageDropzone from '../components/ImageDropzone.jsx';
import Lightbox, { Thumb } from '../components/Lightbox.jsx';

export default function Add() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [note, setNote] = useState('');
  const [studyDate, setStudyDate] = useState(todayStr());
  const [trackEach, setTrackEach] = useState(true);
  const [coverImage, setCoverImage] = useState(null);

  // mode: 'text' | 'image'
  const [mode, setMode] = useState('image');
  const [itemsText, setItemsText] = useState('');
  const [imageItems, setImageItems] = useState([]); // [{ image_path, content? }]

  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);

  const addImages = (paths) => {
    setImageItems(prev => [...prev, ...paths.map(p => ({ image_path: p, content: '' }))]);
  };
  const removeImageItem = (idx) => setImageItems(prev => prev.filter((_, i) => i !== idx));
  const updateImageItemText = (idx, content) => setImageItems(prev =>
    prev.map((it, i) => i === idx ? { ...it, content } : it)
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('请填写批次标题');
    setSubmitting(true);
    try {
      let items = [];
      if (mode === 'text') {
        items = itemsText.split('\n').map(s => s.trim()).filter(Boolean).map(content => ({ content }));
      } else {
        items = imageItems.filter(it => it.image_path || (it.content || '').trim());
      }
      const { id } = await api.createBatch({
        title: title.trim(),
        source: source.trim() || null,
        note: note.trim() || null,
        study_date: studyDate,
        image_path: coverImage,
        items,
        track_each: trackEach,
      });
      nav(`/batches/${id}`);
    } catch (e) {
      alert('保存失败：' + e.message);
    } finally { setSubmitting(false); }
  };

  const itemCountText = itemsText.split('\n').filter(s => s.trim()).length;
  const itemCount = mode === 'text' ? itemCountText : imageItems.length;

  return (
    <div className="max-w-3xl mx-auto">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">封面图（可选）</label>
          {coverImage ? (
            <div className="flex items-center gap-3">
              <Thumb src={coverImage} size="h-32" onClick={() => setPreview(coverImage)} />
              <button type="button" className="btn-danger text-sm" onClick={() => setCoverImage(null)}>移除</button>
            </div>
          ) : (
            <ImageDropzone multiple={false} onChange={(paths) => setCoverImage(paths[0])}
              hint="适合「整批截一张图」的场景" />
          )}
        </div>

        {/* 模式切换 */}
        <div>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <label className="block text-sm font-medium text-gray-700">题目（{itemCount}）</label>
            <div className="inline-flex rounded-md bg-gray-100 p-0.5 text-sm">
              <button type="button"
                className={`px-3 py-1 rounded ${mode === 'image' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                onClick={() => setMode('image')}>📷 图片批量</button>
              <button type="button"
                className={`px-3 py-1 rounded ${mode === 'text' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
                onClick={() => setMode('text')}>✍️ 文本批量</button>
            </div>
          </div>

          {mode === 'text' ? (
            <textarea className="input min-h-[160px] font-mono text-[13px]"
              placeholder="第1题 …&#10;第2题 …&#10;…"
              value={itemsText} onChange={e => setItemsText(e.target.value)} />
          ) : (
            <div className="space-y-3">
              <ImageDropzone onChange={addImages}
                hint="支持一次粘贴/拖拽多张，每张图自动成为一题" />
              {imageItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {imageItems.map((it, idx) => (
                    <div key={idx} className="card p-2 space-y-2">
                      <div className="relative">
                        <Thumb src={it.image_path} size="h-32 w-full" onClick={() => setPreview(it.image_path)} />
                        <button type="button"
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs hover:bg-red-500"
                          onClick={() => removeImageItem(idx)}>×</button>
                        <span className="absolute bottom-1 left-1 pill bg-black/60 text-white">#{idx + 1}</span>
                      </div>
                      <input className="input text-xs" placeholder="备注（可选）"
                        value={it.content} onChange={e => updateImageItemText(idx, e.target.value)} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" className="rounded mt-0.5" checked={trackEach}
            onChange={e => setTrackEach(e.target.checked)} />
          <span>
            <b>独立追踪每题</b>
            <span className="text-gray-400 ml-1">勾选后每题单独生成复习计划，否则只整批一起复习</span>
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

      <Lightbox src={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
