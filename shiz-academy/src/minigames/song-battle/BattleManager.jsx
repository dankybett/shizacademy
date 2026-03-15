import React, { useEffect, useMemo, useRef, useState } from 'react';
import useTetris from './useTetris';
import useTetrisAI from './useTetrisAI';
import GameBoard from './GameBoard.jsx';
import { BLOCK_SRC, COLS, ROWS } from './Constants';
import MiniPreview from './MiniPreview.jsx';
import GarbagePreview from './GarbagePreview.jsx';
import VerticalGarbageMeter from './VerticalGarbageMeter.jsx';

const baseAttack = { 1: 0, 2: 1, 3: 2, 4: 4 };
const comboTable = [0,0,1,1,2,2,3,3,4,4,4,5]; // index = combo count, clamped
const calcAttack = ({ cleared, combo, isB2B }) => {
  const base = baseAttack[cleared] || 0;
  const b2b = isB2B ? 1 : 0;
  const c = comboTable[Math.min(combo, comboTable.length - 1)] || 0;
  return base + b2b + c;
};

export default function BattleManager({ onClose }) {
  const player = useTetris();
  const ai = useTetris();
  const { bestMove } = useTetrisAI();

  const [cellPx, setCellPx] = useState(28);

  useEffect(() => {
    const updateCell = () => {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

      const modalMaxW = 820; // matches SongBattleModal card max width
      const containerW = Math.min(vw * 0.96, modalMaxW);

      // Rough width budget: two side panels, inner + outer gaps, small center column
      const sideEstimate = 110; // Hold/Next column approx
      const outerGaps = 16 * 2; // grid gap between 3 cols -> two gaps
      const innerGaps = 16 * 2; // left/right flex gaps between board and side panel
      const centerW = 24; // "VS" text

      const widthBudget = containerW - (sideEstimate * 2) - outerGaps - innerGaps - centerW;
      const cellFromWidth = Math.floor(widthBudget / (2 * COLS));

      // Height budget: modal max height plus overhead for headers/controls
      const containerH = Math.min(vh * 0.92, 720);
      const overhead = 180; // title, stats, controls
      const heightBudget = containerH - overhead;
      const cellFromHeight = Math.floor(heightBudget / ROWS);

      const next = Math.max(12, Math.min(36, Math.min(cellFromWidth, cellFromHeight)));
      setCellPx(Number.isFinite(next) && next > 0 ? next : 16);
    };
    updateCell();
    window.addEventListener('resize', updateCell);
    return () => window.removeEventListener('resize', updateCell);
  }, []);

  const [result, setResult] = useState(null); // 'win' | 'lose' | 'draw'
  const [playerReason, setPlayerReason] = useState(null);
  const [aiReason, setAIReason] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');

  const DIFFS = {
    easy:   { label: 'Easy',   actionMs: 200, thinkMs: 120, noise: 0.35, topK: 4 },
    normal: { label: 'Normal', actionMs: 100, thinkMs: 0,   noise: 0.12, topK: 3 },
    hard:   { label: 'Hard',   actionMs: 75,  thinkMs: 0,   noise: 0.03, topK: 2 },
    expert: { label: 'Expert', actionMs: 55,  thinkMs: 0,   noise: 0.0,  topK: 1 },
    insane: { label: 'Insane', actionMs: 40,  thinkMs: 0,   noise: 0.0,  topK: 1 },
  };
  const aiPlanRef = useRef(null); // {rotSteps, moveDir, moveSteps}
  const aiActTimerRef = useRef(null);
  const pendingPlayerRef = useRef(0);
  const pendingAIRef = useRef(0);
  const [pendingPlayer, setPendingPlayer] = useState(0);
  const [pendingAI, setPendingAI] = useState(0);
  const pendingPlayerHoleRef = useRef(null);
  const pendingAIHoleRef = useRef(null);
  const [pendingPlayerHole, setPendingPlayerHole] = useState(null);
  const [pendingAIHole, setPendingAIHole] = useState(null);
  const [playerCancel, setPlayerCancel] = useState(null); // { amt, ts }
  const [aiCancel, setAICancel] = useState(null); // { amt, ts }
  const applyPTimerRef = useRef(null);
  const applyAITimerRef = useRef(null);
  const aiPlanTimerRef = useRef(null);

  const scheduleApply = (side) => {
    const isPlayer = side === 'player';
    const ref = isPlayer ? applyPTimerRef : applyAITimerRef;
    clearTimeout(ref.current);
    ref.current = setTimeout(() => {
      const amount = isPlayer ? pendingPlayerRef.current : pendingAIRef.current;
      if (amount > 0) {
        if (isPlayer) {
          pendingPlayerRef.current = 0; setPendingPlayer(0);
          player.actions.addGarbage(amount);
        } else {
          pendingAIRef.current = 0; setPendingAI(0);
          ai.actions.addGarbage(amount);
        }
      }
    }, 550);
  };

  // Garbage exchange
  useEffect(() => {
    player.actions.setOnLinesCleared((info) => {
      const send = calcAttack(info);
      // Cancel incoming first
      const cancel = Math.min(send, pendingPlayerRef.current);
      if (cancel > 0) {
        pendingPlayerRef.current -= cancel; setPendingPlayer(pendingPlayerRef.current);
        if (pendingPlayerRef.current <= 0) { pendingPlayerRef.current = 0; setPendingPlayer(0); pendingPlayerHoleRef.current = null; setPendingPlayerHole(null); }
        // Flash a cancel indicator for the player
        setPlayerCancel({ amt: cancel, ts: Date.now() });
      }
      const leftover = send - cancel;
      if (leftover > 0) {
        const wasZero = pendingAIRef.current <= 0;
        pendingAIRef.current += leftover; setPendingAI(pendingAIRef.current);
        if (wasZero) {
          pendingAIHoleRef.current = Math.floor(Math.random() * COLS); setPendingAIHole(pendingAIHoleRef.current);
        }
      }
    });
    ai.actions.setOnLinesCleared((info) => {
      const send = calcAttack(info);
      const cancel = Math.min(send, pendingAIRef.current);
      if (cancel > 0) {
        pendingAIRef.current -= cancel; setPendingAI(pendingAIRef.current);
        if (pendingAIRef.current <= 0) { pendingAIRef.current = 0; setPendingAI(0); pendingAIHoleRef.current = null; setPendingAIHole(null); }
        // Flash a blocked indicator for the AI (they blocked your garbage)
        setAICancel({ amt: cancel, ts: Date.now() });
      }
      const leftover = send - cancel;
      if (leftover > 0) {
        const wasZero = pendingPlayerRef.current <= 0;
        pendingPlayerRef.current += leftover; setPendingPlayer(pendingPlayerRef.current);
        if (wasZero) {
          pendingPlayerHoleRef.current = Math.floor(Math.random() * COLS); setPendingPlayerHole(pendingPlayerHoleRef.current);
        }
      }
    });
  }, [player.actions, ai.actions]);

  // Rise-on-lock: apply pending garbage on each side's lock
  useEffect(() => {
    player.actions.setOnLock(() => {
      const amt = pendingPlayerRef.current;
      if (amt > 0) {
        const hole = pendingPlayerHoleRef.current;
        pendingPlayerRef.current = 0; setPendingPlayer(0);
        pendingPlayerHoleRef.current = null; setPendingPlayerHole(null);
        player.actions.addGarbage(amt, hole);
      }
    });
    ai.actions.setOnLock(() => {
      const amt = pendingAIRef.current;
      if (amt > 0) {
        const hole = pendingAIHoleRef.current;
        pendingAIRef.current = 0; setPendingAI(0);
        pendingAIHoleRef.current = null; setPendingAIHole(null);
        ai.actions.addGarbage(amt, hole);
      }
    });
  }, [player.actions, ai.actions]);

  // End conditions
  useEffect(() => {
    if (result) return;
    if (player.state.gameOver && ai.state.gameOver) { setResult('draw'); setPlayerReason(player.state.gameOverReason); setAIReason(ai.state.gameOverReason); }
    else if (player.state.gameOver) { setResult('lose'); setPlayerReason(player.state.gameOverReason); }
    else if (ai.state.gameOver) { setResult('win'); setAIReason(ai.state.gameOverReason); }
  }, [player.state.gameOver, ai.state.gameOver, result]);

  // Immediate end hooks from engines
  useEffect(() => {
    player.actions.setOnGameOver((reason) => { setPlayerReason(reason); setResult('lose'); player.actions.setPaused(true); ai.actions.setPaused(true); ai.actions.setSoftDrop(false); });
    ai.actions.setOnGameOver((reason) => { setAIReason(reason); setResult('win'); player.actions.setPaused(true); ai.actions.setPaused(true); ai.actions.setSoftDrop(false); });
  }, [player.actions, ai.actions]);

  // AI planning: when AI gets a (new) current piece and no plan, compute one
  useEffect(() => {
    if (result) return;
    const cur = ai.state.current;
    if (!cur) return;
    if (!aiPlanRef.current) {
      clearTimeout(aiPlanTimerRef.current);
      const conf = DIFFS[difficulty] || DIFFS.normal;
      aiPlanTimerRef.current = setTimeout(() => {
        const plan = bestMove(ai.state.board, cur, { noise: conf.noise, topK: conf.topK });
        aiPlanRef.current = plan || null;
      }, conf.thinkMs);
    }
  }, [ai.state.board, ai.state.current, bestMove, result, difficulty]);

  // AI execution loop
  useEffect(() => {
    if (result) { clearInterval(aiActTimerRef.current); return; }
    clearInterval(aiActTimerRef.current);
    const conf = DIFFS[difficulty] || DIFFS.normal;
    aiActTimerRef.current = setInterval(() => {
      const plan = aiPlanRef.current;
      if (!plan) return;
      if (plan.rotSteps > 0) { ai.actions.rotateCW(); plan.rotSteps -= 1; return; }
      if (plan.moveSteps > 0) {
        if (plan.moveDir < 0) ai.actions.moveLeft(); else ai.actions.moveRight();
        plan.moveSteps -= 1;
        return;
      }
      ai.actions.hardDrop();
      aiPlanRef.current = null;
    }, conf.actionMs);
    return () => clearInterval(aiActTimerRef.current);
  }, [ai.actions, result, difficulty]);

  const resetBoth = () => {
    player.actions.reset();
    ai.actions.reset();
    aiPlanRef.current = null;
    setResult(null);
    setPlayerReason(null);
    setAIReason(null);
    pendingPlayerRef.current = 0; setPendingPlayer(0);
    pendingAIRef.current = 0; setPendingAI(0);
    try { ai.actions.setSoftDrop(false); } catch (_) {}
    try { player.actions.setSoftDrop(false); } catch (_) {}
  };

  const panel = (label, s) => (
    <div style={{ display:'flex', gap:10, alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ fontWeight:800 }}>{label}</div>
      <div style={{ display:'flex', gap:10, opacity:.9 }}>
        <div>Score: <b>{s.score}</b></div>
        <div>Lines: <b>{s.lines}</b></div>
        <div>Level: <b>{s.level}</b></div>
      </div>
    </div>
  );

  return (
    <div style={{ position:'relative' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
      <div style={{ display:'grid', gap:10 }}>
        {panel('You', player.state)}
        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
          <div style={{ position:'relative', width: COLS*cellPx, height: ROWS*cellPx }}>
            <GameBoard
              board={player.state.board}
              current={player.state.current}
              ghost={player.state.ghost}
              cellPx={cellPx}
              onTapRotate={player.actions.rotateCW}
              onHoldDownStart={() => player.actions.setSoftDrop(true)}
              onHoldDownEnd={() => player.actions.setSoftDrop(false)}
            />
            <VerticalGarbageMeter rows={pendingPlayer} heightPx={ROWS*cellPx} />
            {playerCancel && (
              <CancelBadge key={playerCancel.ts} amt={playerCancel.amt} />
            )}
          </div>
          <div style={{ display:'grid', gap:14, minWidth:80 }}>
        <div style={{ display:'grid', gap:6 }}>
          <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Hold</div>
          <MiniPreview id={player.state.holdId} size={60} title={'Hold'} />
          <button style={btn('secondary')} onClick={player.actions.holdPiece}>Hold</button>
        </div>
        <div style={{ display:'grid', gap:6 }}>
          <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Next</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <MiniPreview id={player.state.next && player.state.next[0]} size={44} title={'Next'} />
          </div>
        </div>
        <GarbagePreview count={pendingPlayer} hole={pendingPlayerHole} cols={COLS} title={'Incoming'} />
      </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={btn()} onClick={player.actions.moveLeft}>◀ Left</button>
          <button style={btn()} onClick={player.actions.moveRight}>Right ▶</button>
          <button style={btn('secondary')} onClick={player.actions.hardDrop}>Hard Drop</button>
        </div>
      </div>
      <div style={{ alignSelf:'center', opacity:.6 }}>VS</div>
      <div style={{ display:'grid', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          {panel('AI', ai.state)}
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:12, opacity:.9 }}>Difficulty</span>
            <select value={difficulty} onChange={(e)=> setDifficulty(e.target.value)} style={{ background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'4px 8px' }}>
              {Object.entries(DIFFS).map(([k,v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
          <div style={{ position:'relative', width: COLS*cellPx, height: ROWS*cellPx }}>
            <GameBoard
              board={ai.state.board}
              current={ai.state.current}
              ghost={ai.state.ghost}
              cellPx={cellPx}
            />
            <VerticalGarbageMeter rows={pendingAI} heightPx={ROWS*cellPx} />
            {aiCancel && (
              <CancelBadge key={aiCancel.ts} amt={aiCancel.amt} label={'Blocked'} side={'left'} variant={'ai'} />
            )}
          </div>
          <div style={{ display:'grid', gap:14, minWidth:80 }}>
            <div style={{ display:'grid', gap:6 }}>
              <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Hold</div>
              <MiniPreview id={ai.state.holdId} size={60} title={'Hold'} />
            </div>
          <div style={{ display:'grid', gap:6 }}>
            <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Next</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <MiniPreview id={ai.state.next && ai.state.next[0]} size={44} title={'Next'} />
            </div>
          </div>
          <GarbagePreview count={pendingAI} hole={pendingAIHole} cols={COLS} title={'Incoming'} />
        </div>
        </div>
        <div style={{ fontSize:12, opacity:.8 }}>AI plays automatically</div>
      </div>

      <div style={{ gridColumn:'1 / -1', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 4 }}>
        <div style={{ fontWeight:700 }}>
          {result === 'win' && 'You win!'}
          {result === 'lose' && 'You lose!'}
          {result === 'draw' && 'Draw!'}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div title="Incoming garbage" style={{ opacity:.85 }}>
            You: +{pendingPlayer} | AI: +{pendingAI}
          </div>
          <button style={btn('secondary')} onClick={resetBoth}>Restart</button>
          <button style={btn('danger')} onClick={onClose}>Close</button>
        </div>
      </div>
      </div>
      {result && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.55)' }}>
          <div style={{ background:'rgba(25,28,36,0.95)', border:'1px solid rgba(255,255,255,0.22)', borderRadius:12, padding:16, color:'#fff', display:'grid', gap:10, minWidth: 240, textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:18 }}>
              {result === 'win' ? 'You Win!' : result === 'lose' ? 'You Lose!' : 'Draw!'}
            </div>
            <div style={{ fontSize:13, opacity:.9 }}>
              {result === 'win' && (
                <>Opponent: {humanizeReason(aiReason)}</>
              )}
              {result === 'lose' && (
                <>You: {humanizeReason(playerReason)}</>
              )}
              {result === 'draw' && (
                <>Both players ended.</>
              )}
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
              <button style={btn('secondary')} onClick={resetBoth}>Restart</button>
              <button style={btn('danger')} onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function humanizeReason(r) {
  switch (r) {
    case 'topout': return 'Topped out';
    case 'spawn': return 'Could not spawn a piece';
    case 'garbage': return 'Buried by garbage';
    case 'swap': return 'Hold swap failed to place';
    default: return 'Game over';
  }
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

function CancelBadge({ amt, label = 'Canceled', side = 'right', variant = 'player' }) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  const color = variant === 'ai' ? 'rgba(80,140,255,0.85)' : 'rgba(40,160,80,0.85)';
  const border = variant === 'ai' ? 'rgba(180,205,255,0.6)' : 'rgba(180,255,200,0.6)';
  const pos = side === 'left' ? { left: -84 } : { right: -84 };
  return (
    <div style={{ position:'absolute', top:8, ...pos, background:color, color:'#fff', border:`1px solid ${border}`, borderRadius:8, padding:'4px 8px', fontSize:12, boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
      {label} +{amt}
    </div>
  );
}
