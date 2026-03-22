import React from 'react';
import BattleManager from './BattleManager.jsx';

export default function SongBattleModal({ onClose }) {

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
        <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', flex: '1 1 auto', minHeight: 0 }}>
          <div style={{ width:'100%', flex: '1 1 auto', minHeight: 0 }}>
            <BattleManager onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
