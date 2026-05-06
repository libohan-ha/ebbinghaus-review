import React, { useRef, useState } from 'react';
import { uploadFiles } from '../api.js';

/**
 * 通用图片上传区：支持点击选择 / 拖拽 / 粘贴
 * - multiple=true: 多张图（用于「图片批量」录入）
 * - multiple=false: 单张图（用于批次封面）
 * onChange(paths): 上传成功后回调 server 路径数组（始终是数组）
 */
export default function ImageDropzone({ multiple = true, onChange, hint }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setUploading(true);
    try {
      const { paths } = await uploadFiles(multiple ? imgs : imgs.slice(0, 1));
      onChange(paths);
    } catch (e) {
      alert('上传失败：' + e.message);
    } finally { setUploading(false); }
  };

  const onPaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const files = items.filter(it => it.kind === 'file' && it.type.startsWith('image/')).map(it => it.getAsFile());
    if (files.length) {
      e.preventDefault();
      await handleFiles(files);
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={onPaste}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      className={`cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition outline-none
        ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 bg-gray-50'}
        ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input ref={inputRef} type="file" accept="image/*" multiple={multiple}
        className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <div className="text-sm text-gray-500">
        {uploading ? '⏳ 上传中…' : (
          <>
            <div className="text-2xl mb-1">📷</div>
            点击选择 · 拖拽到此 · 或先点这里再 <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-xs">Ctrl+V</kbd> 粘贴截图
            {hint && <div className="mt-1 text-xs text-gray-400">{hint}</div>}
          </>
        )}
      </div>
    </div>
  );
}
