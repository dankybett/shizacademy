import React from 'react';
import BattleManager from './BattleManager.jsx';

export default function SongBattleModal({ onClose, opponent, onResult, playerName }) {
  const [started, setStarted] = React.useState(false);

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
      onClick={started ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(98vw, 1100px)',
          height: '96vh',
          background: "#000 url('/art/songbattlebackground.png') center/cover no-repeat",
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 14,
          padding: 14,
          boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {started ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flex: '1 1 auto', minHeight: 0 }}>
            <div style={{ width:'100%', flex: '1 1 auto', minHeight: 0 }}>
              <BattleManager onClose={onClose} initialOpponent={opponent} onResult={onResult} playerName={playerName} />
            </div>
          </div>
        ) : (
          <div style={{ position:'relative', display:'grid', placeItems:'center', flex:'1 1 auto', minHeight:0 }}>
            <div style={{
              background:'rgba(20,22,28,0.92)',
              border:'1px solid rgba(255,255,255,0.22)',
              borderRadius:12,
              padding:'18px 20px',
              boxShadow:'0 10px 28px rgba(0,0,0,0.45)',
              display:'grid',
              gap:12,
              minWidth:220,
              textAlign:'center',
            }}>
              <div style={{ fontWeight:900, fontSize:22, letterSpacing:0.4 }}>Song Battle</div>
              <button
                onClick={() => setStarted(true)}
                style={{
                  padding:'10px 16px',
                  borderRadius:10,
                  background:'rgba(255,255,255,0.14)',
                  border:'1px solid rgba(255,255,255,0.28)',
                  color:'#fff',
                  fontWeight:800,
                  cursor:'pointer',
                  transition:'transform 80ms ease, background 160ms ease',
                }}
              >
                Start
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
