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

export default function GameBoard({ board, current, ghost, itemBoard, currentItemPick, bombCells, logHintCells, logAnim, logMaskCells, onTapRotate, onHoldDownStart, onHoldDownEnd, cellPx = 28 }) {
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
            const masked = Array.isArray(logMaskCells) && logMaskCells.some(([mx, my]) => mx === x && my === y);
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
                {id > 0 && !masked && (
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
      {/* Bomb telegraph overlay */}
      {Array.isArray(bombCells) && bombCells.length > 0 && bombCells.map(([bx, by], i) => (
        (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) ? (
          <div key={`bomb-${i}`} style={{ position: 'absolute', left: bx * cellPx, top: by * cellPx, width: cellPx, height: cellPx, pointerEvents:'none', zIndex: 5 }}>
            <div style={{ position:'absolute', inset:2, border:'2px dashed rgba(255,120,120,0.95)', borderRadius:4, boxShadow:'0 0 8px rgba(255,60,60,0.7), inset 0 0 6px rgba(255,80,80,0.6)' }} />
          </div>
        ) : null
      ))}
      {/* Griswald log predicted landing overlay */}
      {Array.isArray(logHintCells) && logHintCells.length > 0 && logHintCells.map(([lx, ly], i) => (
        (ly >= 0 && ly < ROWS && lx >= 0 && lx < COLS) ? (
          <div key={`loghint-${i}`} style={{ position: 'absolute', left: lx * cellPx, top: ly * cellPx, width: cellPx, height: cellPx, pointerEvents:'none', zIndex: 4 }}>
            <div style={{ position:'absolute', inset:2, border:'2px dashed rgba(160,120,60,0.95)', borderRadius:4, boxShadow:'0 0 6px rgba(160,120,60,0.6), inset 0 0 4px rgba(160,120,60,0.6)' }} />
          </div>
        ) : null
      ))}
      {/* Griswald log falling overlay (purely visual) */}
      {logAnim && Number.isFinite(logAnim.x) && Number.isFinite(logAnim.topPx) && (
        <div style={{ position:'absolute', left: logAnim.x * cellPx, top: logAnim.topPx, width: 4 * cellPx, height: cellPx, pointerEvents:'none', zIndex: 6, display:'flex' }}>
          {[0,1,2,3].map((i) => (
            <img key={i} src={BLOCK_SRC[9]} alt={'wood'} style={{ width: cellPx, height: cellPx, imageRendering:'pixelated', objectFit:'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,0.65))' }} />
          ))}
        </div>
      )}
    </div>
  );
}
