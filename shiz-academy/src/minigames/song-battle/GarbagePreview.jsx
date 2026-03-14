import React from 'react';

export default function GarbagePreview({ count = 0, hole = null, cols = 10, width = 60, heightPer = 6, title = 'Incoming' }) {
  const rows = Math.max(0, Number(count || 0));
  const w = width;
  const h = Math.max(heightPer, 4);
  const holeX = (idx) => {
    const pad = 3;
    const usable = Math.max(0, w - pad * 2);
    if (hole == null || cols <= 1) return pad + usable / 2 - 2;
    const x = pad + (hole / (cols - 1)) * usable;
    return Math.max(pad, Math.min(w - pad - 4, x - 2));
  };
  return (
    <div style={{ display:'grid', gap:6 }}>
      <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>{title} {rows > 0 ? `(+${rows})` : ''}</div>
      <div style={{ width: w, minHeight: h * Math.min(rows, 16), border:'1px solid rgba(255,255,255,0.22)', borderRadius:6, background:'rgba(255,255,255,0.04)', padding:3 }}>
        {Array.from({ length: Math.min(rows, 16) }).map((_, i) => (
          <div key={i} style={{ position:'relative', width: '100%', height: h, marginBottom: 2, background: 'rgba(255,90,90,0.45)', border: '1px solid rgba(255,90,90,0.6)', borderRadius: 2 }}>
            <div style={{ position:'absolute', top: 2, left: holeX(i), width: 4, height: h-3, background: 'rgba(0,0,0,0.85)', borderRadius: 1 }} />
          </div>
        ))}
        {rows > 16 && (
          <div style={{ fontSize: 11, opacity: .85, textAlign:'center', marginTop: 2 }}>+{rows - 16} more</div>
        )}
      </div>
    </div>
  );
}

