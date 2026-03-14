import React from 'react';

export default function VerticalGarbageMeter({ rows = 0, maxRows = 20, heightPx = 560, widthPx = 10, flash = false, showCount = true }) {
  const h = Math.max(0, Math.min(Number(rows || 0), maxRows));
  const fillH = Math.round((h / maxRows) * heightPx);
  return (
    <div
      title={rows > 0 ? `Incoming +${rows}` : 'No incoming'}
      style={{
        position: 'absolute',
        right: -12,
        top: 0,
        width: widthPx,
        height: heightPx,
        border: '1px solid rgba(255,255,255,0.28)',
        borderRadius: 6,
        background: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        boxShadow: flash ? '0 0 0 2px rgba(255,120,120,0.35)' : 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: fillH,
          background: 'linear-gradient(180deg, rgba(255,100,100,0.85), rgba(255,60,60,0.85))',
        }}
      />
      {showCount && rows > 0 && (
        <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>+{rows}</div>
      )}
    </div>
  );
}

