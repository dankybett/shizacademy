import React, { useMemo, useRef, useState } from 'react';
import { BLOCK_SRC, COLS, ROWS, SHAPES } from './Constants';

function drawCells(board, current, ghost) {
  const b = board.map((r) => r.slice());
  if (ghost) {
    const gshape = SHAPES[ghost.id][ghost.rot];
    for (const [dx, dy] of gshape) {
      const x = ghost.x + dx, y = ghost.y + dy;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) b[y][x] = -ghost.id; // ghost mark as negative
    }
  }
  if (current) {
    const cshape = SHAPES[current.id][current.rot];
    for (const [dx, dy] of cshape) {
      const x = current.x + dx, y = current.y + dy;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) b[y][x] = current.id;
    }
  }
  return b;
}

export default function GameBoard({ board, current, ghost, itemBoard, currentItemPick, onTapRotate, onHoldDownStart, onHoldDownEnd, cellPx = 28 }) {
  const canvasRef = useRef(null);
  const [pressStartTs, setPressStartTs] = useState(null);

  const visual = useMemo(() => drawCells(board, current, ghost), [board, current, ghost]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    setPressStartTs(Date.now());
    onHoldDownStart && onHoldDownStart();
  };
  const handlePointerUp = (e) => {
    e.preventDefault();
    const dt = pressStartTs ? Date.now() - pressStartTs : 9999;
    setPressStartTs(null);
    onHoldDownEnd && onHoldDownEnd();
    if (dt < 200) onTapRotate && onTapRotate();
  };
  const handlePointerCancel = () => {
    setPressStartTs(null);
    onHoldDownEnd && onHoldDownEnd();
  };

  return (
    <div
      style={{
        position: 'relative',
        width: COLS * cellPx,
        height: ROWS * cellPx,
        background: 'rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 8,
        overflow: 'hidden',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
    >
      {visual.map((row, y) => (
        <div key={y} style={{ display: 'flex', height: cellPx }}>
          {row.map((v, x) => {
            const id = Math.abs(v);
            const isGhost = v < 0;
            const hasItemOverlay = (() => {
              try {
                if (itemBoard && itemBoard[y] && itemBoard[y][x]) return true;
                if (current && currentItemPick != null) {
                  const shape = SHAPES[current.id][current.rot] || [];
                  const ii = Math.max(0, Math.min(currentItemPick, shape.length - 1));
                  const [dx, dy] = shape[ii] || [];
                  const cx = current.x + dx, cy = current.y + dy;
                  if (cx === x && cy === y) return true;
                }
              } catch (_) {}
              return false;
            })();
            return (
              <div key={x} style={{ width: cellPx, height: cellPx, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 1, background: 'rgba(255,255,255,0.05)' }} />
                {id > 0 && (
                  <img
                    src={BLOCK_SRC[id]}
                    alt={`b${id}`}
                    style={{
                      position: 'absolute',
                      inset: 2,
                      width: 'calc(100% - 4px)',
                      height: 'calc(100% - 4px)',
                      opacity: isGhost ? 0.28 : 1,
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                    }}
                  />
                )}
                {hasItemOverlay && (
                  <img
                    src={'/art/tetrominoes/d12.png'}
                    alt={'d12'}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: Math.floor(cellPx * 0.72),
                      height: Math.floor(cellPx * 0.72),
                      opacity: isGhost ? 0.5 : 1,
                      pointerEvents: 'none',
                      imageRendering: 'pixelated',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                    }}
                    onError={(e)=>{ e.currentTarget.style.display='none'; }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
