import React, { useEffect, useMemo, useRef, useState } from 'react';
import useTetris from './useTetris';
import useTetrisAI from './useTetrisAI';
import GameBoard from './GameBoard.jsx';
import { BLOCK_SRC, COLS, ROWS, SHAPES } from './Constants';
import MiniPreview from './MiniPreview.jsx';
import GarbagePreview from './GarbagePreview.jsx';
import VerticalGarbageMeter from './VerticalGarbageMeter.jsx';
import AudioTugController from './AudioTugController';

const baseAttack = { 1: 0, 2: 1, 3: 2, 4: 4 };
const comboTable = [0,0,1,1,2,2,3,3,4,4,4,5]; // index = combo count, clamped
const calcAttack = ({ cleared, combo, isB2B }) => {
  const base = baseAttack[cleared] || 0;
  const b2b = isB2B ? 1 : 0;
  const c = comboTable[Math.min(combo, comboTable.length - 1)] || 0;
  return base + b2b + c;
};

export default function BattleManager({ onClose }) {
  const player = useTetris({ enableItems: true, itemSpawnChance: 0.5 });
  const ai = useTetris();
  const { bestMove } = useTetrisAI();

  const [cellPx, setCellPx] = useState(28);
  const [containerHeight, setContainerHeight] = useState(720);
  const wrapRef = useRef(null);

  useEffect(() => {
    const updateCell = () => {
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

      const modalMaxW = 1100; // matches SongBattleModal card max width
      const rect = wrapRef.current && wrapRef.current.getBoundingClientRect ? wrapRef.current.getBoundingClientRect() : null;
      const containerW = rect ? rect.width : Math.min(vw * 0.98, modalMaxW);

      // Rough width budget: two side panels (no Hold now), inner + outer gaps, small center column
      const sideEstimate = 90; // Next + Incoming approx
      const outerGaps = 8 * 2; // grid gap between 3 cols -> two gaps (now 8)
      const innerGaps = 12 * 2; // left/right flex gaps between board and side panel
      const centerW = 16; // "VS" text

      const widthBudget = containerW - (sideEstimate * 2) - outerGaps - innerGaps - centerW;
      const cellFromWidth = Math.floor(widthBudget / (2 * COLS));

      // Height budget: use actual container height when available
      const containerH = rect ? Math.floor(rect.height) : Math.floor(vh * 0.96);
      const overhead = 8; // minimal top/bottom spacing; stats moved out
      const heightBudget = containerH - overhead;
      const cellFromHeight = Math.floor(heightBudget / ROWS);

      const next = Math.max(12, Math.min(64, Math.min(cellFromWidth, cellFromHeight)));
      const finalCell = Number.isFinite(next) && next > 0 ? next : 16;
      setCellPx(finalCell);
      setContainerHeight(containerH);
    };
    updateCell();
    window.addEventListener('resize', updateCell);
    return () => window.removeEventListener('resize', updateCell);
  }, []);

  const [result, setResult] = useState(null); // 'win' | 'lose' | 'draw'
  const [playerReason, setPlayerReason] = useState(null);
  const [aiReason, setAIReason] = useState(null);
  const [difficulty, setDifficulty] = useState('normal');
  const [opponent, setOpponent] = useState('mcmunch'); // 'mcmunch' | 'griswald'

  const OPPONENTS = {
    mcmunch: { label: 'MC Munch', track: '/art/music/ai.mp3', faceBase: '/art/friends/mcmunch', hasBomb: true },
    griswald: { label: 'Griswald', track: '/art/music/griswald.mp3', faceBase: '/art/friends/griswald', hasBomb: false, hasLog: true },
  };

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
  const audioRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const playerRiskRef = useRef(0);
  const aiRiskRef = useRef(0);
  // const [audioDebug, setAudioDebug] = useState(null);
  const [aiFace, setAIFace] = useState('neutral');
  const aiHitUntilRef = useRef(0);
  const aiHypeUntilRef = useRef(0);
  const [d12Count, setD12Count] = useState(0);
  const [d12Toast, setD12Toast] = useState(null); // { amt, ts }
  // MC Munch: Lyric Bomb power
  const bombTimerRef = useRef(null);
  const [bombCells, setBombCells] = useState(null); // telegraph cells on player board
  const deferredBombRef = useRef(null); // cells to apply after next lock if overlapping
  const playerBoardRef = useRef(null);
  const playerCurrentRef = useRef(null);
  const applyBombRef = useRef(null);
  const nextBombAtRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const [bombCountdownMs, setBombCountdownMs] = useState(null);
  // Griswald countdown + armed flag
  const nextLogAtRef = useRef(null);
  const [logCountdownMs, setLogCountdownMs] = useState(null);
  const [logArmed, setLogArmed] = useState(false);
  const [shake, setShake] = useState({ x: 0, y: 0 });
  const shakeTimerRef = useRef(null);
  const shakeEndRef = useRef(0);
  useEffect(() => { playerBoardRef.current = player.state.board; }, [player.state.board]);
  useEffect(() => { playerCurrentRef.current = player.state.current; }, [player.state.current]);
  useEffect(() => { applyBombRef.current = player.actions.applyBomb; }, [player.actions]);

  // Griswald: Tree Drop (log)
  const logTimerRef = useRef(null);
  const logLaneXRef = useRef(null);
  const [logHintCells, setLogHintCells] = useState(null);
  const logArmedRef = useRef(false);
  const placeLogRef = useRef(null);
  useEffect(() => { placeLogRef.current = player.actions.placeLogRow; }, [player.actions]);
  const [logAnim, setLogAnim] = useState(null); // { x, topPx }
  const logAnimTimerRef = useRef(null);
  const [logMaskCells, setLogMaskCells] = useState(null);

  function computeLogLandingY(board, x0) {
    if (!board || !board.length) return ROWS - 1;
    const w = 4;
    const x = Math.max(0, Math.min(x0, COLS - w));
    let minOcc = ROWS;
    for (let cx = x; cx < x + w; cx++) {
      let occ = ROWS;
      for (let y = 0; y < ROWS; y++) {
        if (board[y][cx] && board[y][cx] !== 0) { occ = y; break; }
      }
      if (occ < minOcc) minOcc = occ;
    }
    const y = minOcc - 1;
    return y;
  }

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

  // Garbage exchange + audio init (re-init if opponent changes to swap AI track)
  useEffect(() => {
    // Set up audio controller
    const ctrl = new AudioTugController({
      playerUrl: '/art/music/player.mp3',
      aiUrl: OPPONENTS[opponent]?.track || '/art/music/ai.mp3',
      computeAdvantage: () => {
        // Pressure = risk + w*pending; advantage favors player when AI pressure is higher
        const w = 0.5;
        const pPending = Math.min(Number(pendingPlayerRef.current || 0) / 10, 1);
        const aPending = Math.min(Number(pendingAIRef.current || 0) / 10, 1);
        const pPressure = playerRiskRef.current + w * pPending;
        const aPressure = aiRiskRef.current + w * aPending;
        const diff = (aPressure - pPressure); // >0 favors player
        const K = 1.6; // scaling
        const raw = diff / K;
        return Math.max(-1, Math.min(1, raw));
      },
    });
    audioRef.current = ctrl;
    ctrl.init().catch(()=>{});
    // If already unlocked, attempt to start immediately
    try { if (audioUnlockedRef.current) ctrl.unlockAndStart(); } catch (_) {}
    return () => { try { ctrl.destroy(); } catch (_) {} };
  }, [opponent]);

  // Track simple risk from board height (normalized 0..1)
  useEffect(() => {
    const calcRisk = (board) => {
      if (!board || !board.length) return 0;
      let highest = -1;
      for (let y = 0; y < board.length; y++) {
        const row = board[y];
        for (let x = 0; x < row.length; x++) {
          if (row[x] && row[x] !== 0) { highest = y; break; }
        }
        if (highest === y) break;
      }
      if (highest < 0) return 0; // empty
      return (board.length - highest) / board.length; // taller stack => higher risk
    };
    playerRiskRef.current = calcRisk(player.state.board);
  }, [player.state.board]);
  useEffect(() => {
    const calcRisk = (board) => {
      if (!board || !board.length) return 0;
      let highest = -1;
      for (let y = 0; y < board.length; y++) {
        const row = board[y];
        for (let x = 0; x < row.length; x++) {
          if (row[x] && row[x] !== 0) { highest = y; break; }
        }
        if (highest === y) break;
      }
      if (highest < 0) return 0;
      return (board.length - highest) / board.length;
    };
    aiRiskRef.current = calcRisk(ai.state.board);
  }, [ai.state.board]);

  // Unlock audio on first interaction inside battle area
  const handleUnlockAudio = () => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    try { audioRef.current && audioRef.current.unlockAndStart(); } catch (_) {}
  };

  // Ducking on clears + garbage exchange handlers
  useEffect(() => {
    player.actions.setOnLinesCleared((info) => {
      const send = calcAttack(info);
      // Cancel incoming first
      const cancel = Math.min(send, pendingPlayerRef.current);
      if (cancel > 0) {
        pendingPlayerRef.current -= cancel; setPendingPlayer(pendingPlayerRef.current);
        if (pendingPlayerRef.current <= 0) { pendingPlayerRef.current = 0; setPendingPlayer(0); pendingPlayerHoleRef.current = null; setPendingPlayerHole(null); }
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
      try {
        const kind = info.cleared >= 4 ? 'tetris' : 'line';
        audioRef.current && audioRef.current.onClear('player', kind);
      } catch (_) {}
    });
    ai.actions.setOnLinesCleared((info) => {
      const send = calcAttack(info);
      const cancel = Math.min(send, pendingAIRef.current);
      if (cancel > 0) {
        pendingAIRef.current -= cancel; setPendingAI(pendingAIRef.current);
        if (pendingAIRef.current <= 0) { pendingAIRef.current = 0; setPendingAI(0); pendingAIHoleRef.current = null; setPendingAIHole(null); }
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
      try {
        const kind = info.cleared >= 4 ? 'tetris' : 'line';
        audioRef.current && audioRef.current.onClear('ai', kind);
      } catch (_) {}
    });
  }, [player.actions, ai.actions]);

  // Item award hook (player only)
  useEffect(() => {
    player.actions.setOnItemAward((amt) => {
      if (!amt) return;
      setD12Count((c) => c + amt);
      setD12Toast({ amt, ts: Date.now() });
      // small audio momentum boost for fun
      try { audioRef.current && audioRef.current.onClear('player', amt >= 2 ? 'tetris' : 'line'); } catch (_) {}
    });
  }, [player.actions]);

  // Rise-on-lock: apply pending garbage on each side's lock
  useEffect(() => {
    player.actions.setOnLock(() => {
      const amt = pendingPlayerRef.current;
      if (amt > 0) {
        const hole = pendingPlayerHoleRef.current;
        pendingPlayerRef.current = 0; setPendingPlayer(0);
        pendingPlayerHoleRef.current = null; setPendingPlayerHole(null);
        player.actions.addGarbage(amt, hole);
        try { audioRef.current && audioRef.current.onGarbageApplied('player', amt); } catch(_) {}
      }
      // Apply deferred Lyric Bomb (if any) safely after lock
      if (deferredBombRef.current && Array.isArray(deferredBombRef.current)) {
        const cells = deferredBombRef.current;
        deferredBombRef.current = null;
        try { applyBombRef.current && applyBombRef.current(cells); } catch(_) {}
        try { audioRef.current && audioRef.current.onGarbageApplied('player', 1); } catch (_) {}
        triggerShake(260);
      }
      // Griswald: Apply log drop if armed (after garbage and bombs)
      if (logArmedRef.current && Number.isFinite(logLaneXRef.current)) {
        const x = Math.max(0, Math.min(logLaneXRef.current, COLS - 4));
        setTimeout(() => {
          const b = playerBoardRef.current;
          const y = computeLogLandingY(b, x);
          if (y >= 0) {
            // Commit board immediately for correctness
            try { placeLogRef.current && placeLogRef.current(x, y, 4, 9); } catch (_) {}
            // Mask committed row until animation finishes to avoid early reveal
            setLogMaskCells([[x, y],[x+1, y],[x+2, y],[x+3, y]]);
            // Run a short falling overlay animation and shake on landing
            try { clearInterval(logAnimTimerRef.current); } catch(_) {}
            const startTop = -Math.floor(cellPx * 3);
            const endTop = y * cellPx;
            const dur = Math.max(160, Math.min(420, 220 + Math.floor(y * 6)));
            const t0 = Date.now();
            setLogAnim({ x, topPx: startTop });
            logAnimTimerRef.current = setInterval(() => {
              const t = Date.now() - t0;
              const p = Math.max(0, Math.min(1, t / dur));
              const ease = 1 - Math.pow(1 - p, 3); // ease-out
              const topPx = Math.round(startTop + (endTop - startTop) * ease);
              setLogAnim({ x, topPx });
              if (p >= 1) {
                clearInterval(logAnimTimerRef.current);
                setLogAnim(null);
                setLogMaskCells(null);
                try { audioRef.current && audioRef.current.onGarbageApplied('player', 1); } catch (_) {}
                triggerShake(240);
              }
            }, 16);
          }
          logArmedRef.current = false;
          setLogArmed(false);
          logLaneXRef.current = null;
          setLogHintCells(null);
        }, 0);
      }
    });
    ai.actions.setOnLock(() => {
      const amt = pendingAIRef.current;
      if (amt > 0) {
        const hole = pendingAIHoleRef.current;
        pendingAIRef.current = 0; setPendingAI(0);
        pendingAIHoleRef.current = null; setPendingAIHole(null);
        ai.actions.addGarbage(amt, hole);
        try { audioRef.current && audioRef.current.onGarbageApplied('ai', amt); } catch(_) {}
        aiHitUntilRef.current = Date.now() + 750; // show hit face briefly
      }
    });
  }, [player.actions, ai.actions]);

  // Temporary hype on AI strong clears
  useEffect(() => {
    ai.actions.setOnLinesCleared((info) => {
      if (!info) return;
      if (info.cleared >= 4) aiHypeUntilRef.current = Date.now() + 800; // Tetris
    });
  }, [ai.actions]);

  // Drive AI face from advantage, risk and recent events
  useEffect(() => {
    const timer = setInterval(() => {
      // Result overrides
      if (result) {
        // result is from the player's perspective
        // player 'win' => AI defeated; player 'lose' => AI celebrate
        setAIFace(result === 'win' ? 'defeated' : result === 'lose' ? 'celebrate' : 'neutral');
        return;
      }
      const now = Date.now();
      if (now < aiHitUntilRef.current) { setAIFace('hit'); return; }
      if (now < aiHypeUntilRef.current) { setAIFace('hyped'); return; }

      // Compute simple advantage consistent with audio compute
      const w = 0.5;
      const pPending = Math.min(Number(pendingPlayerRef.current || 0) / 10, 1);
      const aPending = Math.min(Number(pendingAIRef.current || 0) / 10, 1);
      const pPressure = playerRiskRef.current + w * pPending;
      const aPressure = aiRiskRef.current + w * aPending;
      const diff = (aPressure - pPressure); // >0 favors player
      const K = 1.6;
      const adv = Math.max(-1, Math.min(1, diff / K));

      // Map thresholds to expressions for AI
      if (adv < -0.25) { setAIFace('hyped'); }
      else if (adv < -0.10) { setAIFace('confident'); }
      else if (adv > 0.25) { setAIFace('panicked'); }
      else if (adv > 0.10) { setAIFace('worried'); }
      else { setAIFace('determined'); }
    }, 200);
    return () => clearInterval(timer);
  }, [result]);

  // End conditions
  useEffect(() => {
    if (result) return;
    if (player.state.gameOver && ai.state.gameOver) { setResult('draw'); setPlayerReason(player.state.gameOverReason); setAIReason(ai.state.gameOverReason); }
    else if (player.state.gameOver) { setResult('lose'); setPlayerReason(player.state.gameOverReason); }
    else if (ai.state.gameOver) { setResult('win'); setAIReason(ai.state.gameOverReason); }
  }, [player.state.gameOver, ai.state.gameOver, result]);

  useEffect(() => {
    if (!result) return;
    try {
      if (result === 'win') audioRef.current && audioRef.current.onGameOver('player');
      else if (result === 'lose') audioRef.current && audioRef.current.onGameOver('ai');
      else audioRef.current && audioRef.current.pause();
    } catch (_) {}
  }, [result]);

  // Debug polling disabled (hide audio tug-of-war debug panel)

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

  // MC Munch: Lyric Bomb scheduling (telegraph + detonate)
  useEffect(() => {
    if (result || opponent !== 'mcmunch') {
      clearTimeout(bombTimerRef.current);
      setBombCells(null);
      setBombCountdownMs(null);
      nextBombAtRef.current = null; // ensure countdown ticker has nothing to show
      return;
    }
    clearTimeout(bombTimerRef.current);
    // Less frequent (quarter as frequent vs original): doubled again
    const base = ({ easy: 80000, normal: 60000, hard: 48000, expert: 36000, insane: 32000 })[difficulty] || 60000;
    const jitter = 2000;
    const schedule = (delayMs) => {
      nextBombAtRef.current = Date.now() + Math.max(2000, delayMs);
      bombTimerRef.current = setTimeout(() => {
        const highest = getHighestOccupiedRow(playerBoardRef.current);
        if (highest >= 0 && highest <= 3) { schedule(3000); return; }
        const filled = getFilledCells(playerBoardRef.current);
        if (filled.length === 0) { schedule(3000); return; }
        const [cx, cy] = filled[Math.floor(Math.random() * filled.length)];
        const cells = plusShape(cx, cy, COLS, ROWS);
        setBombCells(cells);
        try { aiHypeUntilRef.current = Date.now() + 800; } catch (_) {}
        setTimeout(() => {
          setBombCells(null);
          if (overlapsCurrentPiece(playerCurrentRef.current, cells)) {
            deferredBombRef.current = cells;
          } else {
            try { applyBombRef.current && applyBombRef.current(cells); } catch(_) {}
            try { audioRef.current && audioRef.current.onGarbageApplied('player', 1); } catch (_) {}
            triggerShake(260);
          }
          const d = base + Math.floor((Math.random() * 2 - 1) * jitter);
          schedule(Math.max(4000, d));
        }, 1000);
      }, Math.max(2000, delayMs));
    };
    const first = base + Math.floor((Math.random() * 2 - 1) * jitter);
    schedule(first);
    return () => clearTimeout(bombTimerRef.current);
  }, [difficulty, result]);

  // Griswald: Tree Drop scheduling (telegraph until next player lock)
  useEffect(() => {
    if (result || opponent !== 'griswald') {
      clearTimeout(logTimerRef.current);
      logLaneXRef.current = null;
      logArmedRef.current = false;
      setLogHintCells(null);
      try { clearInterval(logAnimTimerRef.current); } catch(_) {}
      setLogAnim(null);
      setLogMaskCells(null);
      nextLogAtRef.current = null;
      setLogCountdownMs(null);
      setLogArmed(false);
      return;
    }
    clearTimeout(logTimerRef.current);
    const base = ({ easy: 80000, normal: 60000, hard: 48000, expert: 36000, insane: 32000 })[difficulty] || 60000;
    const jitter = 2000;
    const schedule = (delayMs) => {
      const armDelay = Math.max(2000, delayMs);
      nextLogAtRef.current = Date.now() + armDelay;
      logTimerRef.current = setTimeout(() => {
        if (logArmedRef.current) { // already telegraphed/armed; try again shortly
          schedule(3000);
          return;
        }
        const x = Math.floor(Math.random() * (COLS - 4 + 1));
        logLaneXRef.current = x;
        logArmedRef.current = true;
        setLogArmed(true);
        nextLogAtRef.current = null; setLogCountdownMs(null);
        // Update predicted landing row periodically until drop
        const update = () => {
          const b = playerBoardRef.current;
          const y = computeLogLandingY(b, x);
          if (y >= 0) setLogHintCells([[x, y],[x+1, y],[x+2, y],[x+3, y]]); else setLogHintCells(null);
        };
        update();
        const hintTicker = setInterval(() => {
          if (!logArmedRef.current || result || opponent !== 'griswald') { clearInterval(hintTicker); return; }
          update();
        }, 200);
        const d = base + Math.floor((Math.random() * 2 - 1) * jitter);
        schedule(Math.max(4000, d));
      }, Math.max(2000, delayMs));
    };
    const first = base + Math.floor((Math.random() * 2 - 1) * jitter);
    schedule(first);
    return () => clearTimeout(logTimerRef.current);
  }, [difficulty, result, opponent]);

  function triggerShake(ms = 220) {
    try { clearInterval(shakeTimerRef.current); } catch (_) {}
    shakeEndRef.current = Date.now() + ms;
    setShake({ x: 0, y: 0 });
    shakeTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now > shakeEndRef.current) {
        clearInterval(shakeTimerRef.current);
        setShake({ x: 0, y: 0 });
        return;
      }
      const amp = 2.5;
      setShake({ x: (Math.random() - 0.5) * amp * 2, y: (Math.random() - 0.5) * amp * 2 });
    }, 32);
  }

  // Countdown ticker for incoming power badges (only show last 5s)
  useEffect(() => {
    clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      // MC Munch bomb countdown
      if (!nextBombAtRef.current) setBombCountdownMs(null);
      else {
        const remain = nextBombAtRef.current - Date.now();
        if (remain > 0 && remain <= 5000) setBombCountdownMs(remain); else setBombCountdownMs(null);
      }
      // Griswald log countdown
      if (!nextLogAtRef.current) setLogCountdownMs(null);
      else {
        const remainL = nextLogAtRef.current - Date.now();
        if (remainL > 0 && remainL <= 5000) setLogCountdownMs(remainL); else setLogCountdownMs(null);
      }
    }, 200);
    return () => clearInterval(countdownTimerRef.current);
  }, []);

  function getHighestOccupiedRow(board) {
    if (!board || !board.length) return -1;
    for (let y = 0; y < board.length; y++) {
      const row = board[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x] && row[x] !== 0) return y;
      }
    }
    return -1;
  }
  function getFilledCells(board) {
    const out = [];
    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[0].length; x++) {
        if (board[y][x] >= 1 && board[y][x] <= 7) out.push([x, y]);
      }
    }
    return out;
  }
  function plusShape(cx, cy, cols, rows) {
    const pts = [[cx, cy], [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]];
    return pts.filter(([x, y]) => x >= 0 && x < cols && y >= 0 && y < rows);
  }
  function overlapsCurrentPiece(cur, cells) {
    if (!cur || !cells || cells.length === 0) return false;
    const shape = SHAPES[cur.id][cur.rot] || [];
    const curCells = shape.map(([dx, dy]) => [cur.x + dx, cur.y + dy]);
    for (const [x, y] of cells) {
      for (const [cx, cy] of curCells) if (x === cx && y === cy) return true;
    }
    return false;
  }

  const resetBoth = () => {
    player.actions.reset();
    ai.actions.reset();
    aiPlanRef.current = null;
    setResult(null);
    setPlayerReason(null);
    setAIReason(null);
    pendingPlayerRef.current = 0; setPendingPlayer(0);
    pendingAIRef.current = 0; setPendingAI(0);
    clearTimeout(bombTimerRef.current); setBombCells(null); deferredBombRef.current = null;
    clearTimeout(logTimerRef.current); logLaneXRef.current = null; logArmedRef.current = false; setLogHintCells(null);
    try { clearInterval(logAnimTimerRef.current); } catch(_) {}
    setLogAnim(null);
    try { clearInterval(shakeTimerRef.current); } catch(_) {}
    setShake({ x: 0, y: 0 });
    setLogMaskCells(null);
    try { ai.actions.setSoftDrop(false); } catch (_) {}
    try { player.actions.setSoftDrop(false); } catch (_) {}
  };

  const statLine = (label, s) => (
    <div style={{ display:'flex', gap:6, fontSize:12 }}>
      <div style={{ fontWeight:700, width:24, textAlign:'right' }}>{label}</div>
      <div>Score: <b>{s.score}</b></div>
      <div>Lines: <b>{s.lines}</b></div>
      <div>Level: <b>{s.level}</b></div>
    </div>
  );

  return (
    <div ref={wrapRef} style={{ position:'relative', height: '100%' }} onPointerDown={handleUnlockAudio}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 8,
          display: 'grid',
          gridTemplateColumns: 'auto auto auto',
          gap: 8,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
      >
      <div style={{ display:'grid', gap:10, justifySelf:'end' }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
          {/* Player side panel on the LEFT (Hold removed) */}
          <div style={{ display:'grid', gap:14, minWidth:80 }}>
            <div style={{ display:'grid', gap:6 }}>
              <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Next</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <MiniPreview id={player.state.next && player.state.next[0]} size={44} title={'Next'} />
              </div>
            </div>
            <GarbagePreview count={pendingPlayer} hole={pendingPlayerHole} cols={COLS} title={'Incoming'} />
          </div>
          <div style={{ position:'relative', width: COLS*cellPx, height: ROWS*cellPx, transform: `translate(${shake.x}px, ${shake.y}px)` }}>
            <GameBoard
              board={player.state.board}
              current={player.state.current}
              ghost={player.state.ghost}
              itemBoard={player.state.itemBoard}
              currentItemPick={player.state.currentItemPick}
              bombCells={bombCells}
              logHintCells={logHintCells}
              logAnim={logAnim}
              logMaskCells={logMaskCells}
              cellPx={cellPx}
              onTapRotate={player.actions.rotateCW}
              onHoldDownStart={() => player.actions.setSoftDrop(true)}
              onHoldDownEnd={() => player.actions.setSoftDrop(false)}
            />
          <VerticalGarbageMeter rows={pendingPlayer} heightPx={ROWS*cellPx} side="left" />
          {playerCancel && (
            <CancelBadge key={playerCancel.ts} amt={playerCancel.amt} />
          )}
          {typeof bombCountdownMs === 'number' && bombCountdownMs > 0 && (
            <div style={{ position:'absolute', top: 6, right: 6, background:'rgba(255,120,120,0.9)', color:'#130707', border:'1px solid rgba(255,200,200,0.9)', borderRadius:8, padding:'3px 6px', fontSize:12, fontWeight:800, boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
              Bomb in {Math.ceil(bombCountdownMs/1000)}s
            </div>
          )}
          {typeof logCountdownMs === 'number' && logCountdownMs > 0 && (
            <div style={{ position:'absolute', top: 6, left: 6, background:'rgba(180,130,80,0.9)', color:'#120a04', border:'1px solid rgba(230,200,160,0.9)', borderRadius:8, padding:'3px 6px', fontSize:12, fontWeight:800, boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
              Tree in {Math.ceil(logCountdownMs/1000)}s
            </div>
          )}
          {logArmed && !logCountdownMs && (
            <div style={{ position:'absolute', top: 6, left: 6, background:'rgba(180,130,80,0.95)', color:'#120a04', border:'1px solid rgba(230,200,160,0.95)', borderRadius:8, padding:'3px 6px', fontSize:12, fontWeight:800, boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
              Tree Ready
            </div>
          )}
          {d12Toast && (
            <D12Badge key={d12Toast.ts} amt={d12Toast.amt} />
          )}
        </div>
        </div>
        {/* Player controls moved to bottom row to free vertical space */}
      </div>
      <div style={{ alignSelf:'center', opacity:.6 }}>VS</div>
      <div style={{ display:'grid', gap:10, justifySelf:'start' }}>
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
            <div style={{ fontWeight:700, fontSize:13, opacity:.9 }}>Next</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <MiniPreview id={ai.state.next && ai.state.next[0]} size={44} title={'Next'} />
            </div>
          </div>
          <GarbagePreview count={pendingAI} hole={pendingAIHole} cols={COLS} title={'Incoming'} />
        </div>
        </div>
        {/* moved helper text to bottom controls to free height */}
      </div>

      {/* Corner controls */}
      <button
        style={{ ...btn(), position:'absolute', left: 8, bottom: 8 }}
        onClick={player.actions.moveLeft}
      >
        ◀ Left
      </button>
      <button
        style={{ ...btn(), position:'absolute', right: 8, bottom: 8 }}
        onClick={player.actions.moveRight}
      >
        Right ▶
      </button>

      {/* Friend avatars */}
      <img
        src={'/art/friends/player_profile.png'}
        alt={'You'}
        style={{ position:'absolute', top: 8, left: 8, width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
      />
      {/* D12 counter under player image */}
      <div style={{ position:'absolute', top: 100, left: 8, display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:8, padding:'4px 6px', color:'#fff', fontSize:12 }}>
        <img src={'/art/tetrominoes/d12.png'} alt={'d12'} style={{ width:16, height:16, imageRendering:'pixelated' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
        <span style={{ fontWeight:800 }}>x{d12Count}</span>
      </div>
      <img
        src={`${OPPONENTS[opponent]?.faceBase || '/art/friends/mcmunch'}_${aiFace}.png`}
        alt={`Friend ${aiFace}`}
        style={{ position:'absolute', top: 8, right: 8, width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.35)', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}
        onError={(e) => { e.currentTarget.src = `${OPPONENTS[opponent]?.faceBase || '/art/friends/mcmunch'}_neutral.png`; setTimeout(()=>{ try { e.currentTarget.onerror = null; e.currentTarget.src = '/art/friends/griswald_profile.png'; } catch(_){} }, 0); }}
      />

      {/* Stats box on right */}
      <div style={{ position:'absolute', top: 104, right: 8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.22)', borderRadius:8, padding:'6px 8px', color:'#fff', display:'grid', gap:4, fontSize:12 }}>
        <div style={{ fontWeight:900, fontSize:12.5, letterSpacing:0.2 }}>
          {OPPONENTS[opponent]?.label}{OPPONENTS[opponent]?.hasBomb ? ' — Lyric Bomb' : ''}
        </div>
        <div style={{ fontSize:11, opacity:.88, fontWeight:700 }}>
          {(OPPONENTS[opponent]?.hasBomb ? 'Lyric Bomb' : '') + (OPPONENTS[opponent]?.hasLog ? (OPPONENTS[opponent]?.hasBomb ? ' · ' : '') + 'Tree Fall' : '')}
        </div>
        {statLine('You', player.state)}
        {statLine('AI', ai.state)}
        <div style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'flex-end', marginTop:2 }}>
          <span style={{ fontSize:12, opacity:.9 }}>Difficulty</span>
          <select value={difficulty} onChange={(e)=> setDifficulty(e.target.value)} style={{ background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 6px', fontSize:12 }}>
            {Object.entries(DIFFS).map(([k,v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display:'flex', gap:4, alignItems:'center', justifyContent:'flex-end' }}>
          <span style={{ fontSize:12, opacity:.9 }}>Opponent</span>
          <select value={opponent} onChange={(e)=> setOpponent(e.target.value)} style={{ background:'rgba(255,255,255,0.06)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 6px', fontSize:12 }}>
            {Object.entries(OPPONENTS).map(([k,v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audio debug hidden */}

      
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

function D12Badge({ amt }) {
  const [visible, setVisible] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1200);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div style={{ position:'absolute', top: 40, left: 8, background:'rgba(100,180,255,0.9)', color:'#001', border:'1px solid rgba(200,230,255,0.9)', borderRadius:8, padding:'4px 8px', fontSize:12, boxShadow:'0 2px 8px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:6 }}>
      <img src={'/art/tetrominoes/d12.png'} alt={'d12'} style={{ width:14, height:14, imageRendering:'pixelated' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
      +{amt}
    </div>
  );
}
