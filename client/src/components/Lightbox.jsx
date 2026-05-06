import React, { useEffect } from 'react';

export default function Lightbox({ src, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!src) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}>
      <img src={src} alt="" className="max-w-full max-h-full object-contain rounded shadow-xl"
        onClick={e => e.stopPropagation()} />
      <button className="absolute top-4 right-4 text-white text-2xl w-10 h-10 rounded-full bg-black/40 hover:bg-black/60"
        onClick={onClose}>×</button>
    </div>
  );
}

export function Thumb({ src, size = 'h-20', onClick, className = '' }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      onClick={onClick}
      className={`${size} rounded-md border border-gray-200 object-cover cursor-zoom-in hover:opacity-90 transition ${className}`}
    />
  );
}
