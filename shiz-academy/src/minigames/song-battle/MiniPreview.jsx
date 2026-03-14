import React from 'react';
import { SHAPES, BLOCK_SRC } from './Constants';

export default function MiniPreview({ id, size = 44, rot = 0, title }) {
  const border = '1px solid rgba(255,255,255,0.22)';
  const bg = 'rgba(255,255,255,0.05)';
  if (!id) {
    return (
      <div title={title}
        style={{ width: size, height: size, border, borderRadius: 8, background: bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ opacity: .5, fontSize: 12 }}>—</span>
      </div>
    );
  }
  const shape = SHAPES[id][rot] || [];
  const innerPad = 4; // px padding around the 4x4 grid
  const cell = Math.floor((size - innerPad * 2) / 4);
  const cellPad = Math.max(1, Math.floor(cell * 0.12));
  // Auto-center by bounding box within 4x4
  let minX = 99, maxX = -99, minY = 99, maxY = -99;
  for (const [x, y] of shape) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const width = Math.max(1, maxX - minX + 1);
  const height = Math.max(1, maxY - minY + 1);
  const offX = Math.floor((4 - width) / 2) - minX;
  const offY = Math.floor((4 - height) / 2) - minY;

  return (
    <div title={title}
      style={{ position:'relative', width: size, height: size, border, borderRadius: 8, background: bg }}>
      {/* Optional faint grid */}
      {[0,1,2,3].map((gy) => (
        <div key={gy} style={{ position:'absolute', left: innerPad, right: innerPad, top: innerPad + gy*cell, height: cell, borderTop: gy===0? 'none':'1px solid rgba(255,255,255,0.04)' }} />
      ))}
      {[0,1,2,3].map((gx) => (
        <div key={gx} style={{ position:'absolute', top: innerPad, bottom: innerPad, left: innerPad + gx*cell, width: cell, borderLeft: gx===0? 'none':'1px solid rgba(255,255,255,0.04)' }} />
      ))}
      {shape.map(([dx, dy], i) => (
        <img
          key={i}
          src={BLOCK_SRC[id]}
          alt={`mini-${id}`}
          style={{
            position:'absolute',
            left: innerPad + (dx + offX)*cell + cellPad,
            top: innerPad + (dy + offY)*cell + cellPad,
            width: Math.max(1, cell - cellPad*2),
            height: Math.max(1, cell - cellPad*2),
            imageRendering:'pixelated',
          }}
        />
      ))}
    </div>
  );
}
