import React from 'react';
import useTetris from './useTetris';
import GameBoard from './GameBoard.jsx';
import { BLOCK_SRC, COLS, ROWS } from './Constants';
import MiniPreview from './MiniPreview.jsx';
import BattleManager from './BattleManager.jsx';

export default function SongBattleModal({ onClose }) {
  const [mode, setMode] = React.useState('battle'); // 'solo' | 'battle'
  const { state, actions } = useTetris();
  const { board, current, ghost, score, level, lines, gameOver } = state;

  const [cellPx, setCellPx] = React.useState(28);

  React.useEffect(() => {
    const updateCell = () => {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      const modalMaxW = 820; // matches card width cap
      const containerW = Math.min(vw * 0.96, modalMaxW);

      const sideEstimate = 110; // Hold/Next column approx
      const innerGap = 16;
      const cellFromWidth = Math.floor((containerW - sideEstimate - innerGap) / COLS);

      const containerH = Math.min(vh * 0.92, 720);
      const overhead = 160; // title, stats, controls
      const cellFromHeight = Math.floor((containerH - overhead) / ROWS);

      const next = Math.max(12, Math.min(36, Math.min(cellFromWidth, cellFromHeight)));
      setCellPx(Number.isFinite(next) && next > 0 ? next : 16);
    };
    updateCell();
    window.addEventListener('resize', updateCell);
    return () => window.removeEventListener('resize', updateCell);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(8,10,14,0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(96vw, 820px)',
          maxHeight: '92vh',
          background: 'linear-gradient(180deg, rgba(25,28,36,0.95), rgba(20,22,28,0.95))',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 14,
          padding: 16,
          boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ display:'flex', gap:8, marginBottom: 8 }}>
            <button style={tabBtn(mode==='solo')} onClick={()=>setMode('solo')}>Solo</button>
            <button style={tabBtn(mode==='battle')} onClick={()=>setMode('battle')}>Battle vs AI</button>
          </div>
          {mode==='solo' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>Song Battle</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', opacity: 0.9 }}>
              <div>Score: <b>{score}</b></div>
              <div>Lines: <b>{lines}</b></div>
              <div>Level: <b>{level}</b></div>
            </div>
            <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
              <GameBoard
                board={board}
                current={current}
                ghost={ghost}
                cellPx={cellPx}
                onTapRotate={actions.rotateCW}
                onHoldDownStart={() => actions.setSoftDrop(true)}
                onHoldDownEnd={() => actions.setSoftDrop(false)}
              />
              <div style={{ display:'grid', gap:14, minWidth:80 }}>
                <div style={{ display:'grid', gap:6 }}>
                  <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Hold</div>
                  <MiniPreview id={state.holdId} size={60} title={'Hold'} />
                  <button style={btn('secondary')} onClick={actions.holdPiece}>Hold</button>
                </div>
                <div style={{ display:'grid', gap:6 }}>
                  <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Next</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <MiniPreview id={state.next && state.next[0]} size={44} title={'Next'} />
                  </div>
                </div>
              </div>
            </div>
            {gameOver && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={btn()} onClick={actions.reset}>Restart</button>
                <button style={btn('secondary')} onClick={onClose}>Close</button>
              </div>
            )}
          </div>
          )}
          {mode==='solo' && (
          <div style={{ display: 'grid', gap: 10, minWidth: 180 }}>
            <div style={{ fontWeight: 700 }}>Controls</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>
              • Tap board: rotate piece
              <br />• Hold board: soft drop
              <br />• Buttons: move left/right, hard drop
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={btn()} onClick={actions.rotateCW}>Rotate</button>
              <button style={btn()} onMouseDown={()=>actions.setSoftDrop(true)} onMouseUp={()=>actions.setSoftDrop(false)} onTouchStart={()=>actions.setSoftDrop(true)} onTouchEnd={()=>actions.setSoftDrop(false)}>Soft Drop</button>
              <button style={btn('secondary')} onClick={actions.hardDrop}>Hard Drop</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btn()} onClick={actions.moveLeft}>◀ Left</button>
              <button style={btn()} onClick={actions.moveRight}>Right ▶</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={btn('secondary')} onClick={actions.reset}>Restart</button>
              <button style={btn('danger')} onClick={onClose}>Close</button>
            </div>
          </div>
          )}
          {mode==='battle' && (
            <div style={{ width:'100%' }}>
              <BattleManager onClose={onClose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function btn(kind) {
  const bg = kind === 'danger' ? 'rgba(255,80,80,0.12)'
           : kind === 'secondary' ? 'rgba(255,255,255,0.10)'
           : 'rgba(255,255,255,0.14)';
  const b = kind === 'danger' ? 'rgba(255,80,80,0.35)'
          : 'rgba(255,255,255,0.22)';
  return {
    padding: '8px 12px',
    borderRadius: 8,
    background: bg,
    border: `1px solid ${b}`,
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 120ms ease, transform 80ms ease',
  };
}

function tabBtn(active) {
  return {
    padding: '6px 10px',
    borderRadius: 8,
    border: `1px solid ${active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)'}`,
    background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontWeight: 700,
    cursor: 'pointer',
  };
}
