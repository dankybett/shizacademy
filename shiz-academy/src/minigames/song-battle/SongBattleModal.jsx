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
          maxHeight: '96vh',
          background: 'linear-gradient(180deg, rgba(25,28,36,0.95), rgba(20,22,28,0.95))',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 14,
          padding: 14,
          boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ width:'100%' }}>
            <BattleManager onClose={onClose} />
          </div>
        </div>
      </div>
    </div>
  );
}
