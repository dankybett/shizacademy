import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLS, ROWS, SHAPES, EMPTY, makeEmptyBoard, levelToGravityMs, SOFT_DROP_MS, randomBag7, ITEM_INDEX_MAP } from './Constants';

const spawnX = 3; // left offset from 0
const spawnY = -1; // start slightly above visible grid

const cloneBoard = (b) => b.map((r) => r.slice());

function collides(board, piece) {
  const shape = SHAPES[piece.id][piece.rot];
  for (const [dx, dy] of shape) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && board[y][x] !== EMPTY) return true;
  }
  return false;
}

function merge(board, piece) {
  const b = cloneBoard(board);
  const shape = SHAPES[piece.id][piece.rot];
  for (const [dx, dy] of shape) {
    const x = piece.x + dx;
    const y = piece.y + dy;
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) b[y][x] = piece.id;
  }
  return b;
}

function clearLines(board) {
  const rows = [];
  for (let y = 0; y < ROWS; y++) {
    if (board[y].every((v) => v !== EMPTY)) rows.push(y);
  }
  if (rows.length === 0) return { board, cleared: 0 };
  const b = board.slice();
  for (const y of rows) b.splice(y, 1);
  while (b.length < ROWS) b.unshift(Array(COLS).fill(EMPTY));
  return { board: b, cleared: rows.length };
}

function tryRotate(board, piece, dir) {
  const p = { ...piece, rot: (piece.rot + dir + 4) % 4 };
  if (!collides(board, p)) return p;
  // simple kicks
  for (const k of [-1, 1, -2, 2]) {
    const pk = { ...p, x: p.x + k };
    if (!collides(board, pk)) return pk;
  }
  return piece;
}

export default function useTetris(options = {}) {
  const enableItems = !!options.enableItems;
  const itemSpawnChance = Number.isFinite(options.itemSpawnChance) ? options.itemSpawnChance : 0.25; // 25% default
  const [board, setBoard] = useState(makeEmptyBoard);
  const [current, setCurrent] = useState(null);
  const [queue, setQueue] = useState(() => randomBag7());
  const [nextIdx, setNextIdx] = useState(0);
  const [holdSoftDrop, setHoldSoftDrop] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState(null); // 'spawn'|'topout'|'garbage'|'swap'|'unknown'
  const [paused, setPaused] = useState(false);
  const onLinesClearedRef = useRef(null);
  const onLockRef = useRef(null);
  const onGameOverRef = useRef(null);
  const onItemAwardRef = useRef(null);
  const [holdId, setHoldId] = useState(null);
  const [holdUsed, setHoldUsed] = useState(false);
  const [combo, setCombo] = useState(0);
  const [b2bActive, setB2BActive] = useState(false); // true if last clear was Tetris (eligible) and chain not broken
  // Item system: track item overlay board separately (0/1 markers)
  const [itemBoard, setItemBoard] = useState(() => makeEmptyBoard());
  const [currentItemPick, setCurrentItemPick] = useState(null); // index 0..3 of current shape that has the item, or null
  const itemBoardRef = useRef(null);
  useEffect(() => { itemBoardRef.current = itemBoard; }, [itemBoard]);

  const gravityMs = useMemo(() => (holdSoftDrop ? SOFT_DROP_MS : levelToGravityMs(level)), [holdSoftDrop, level]);
  const timerRef = useRef(null);
  const endedRef = useRef(false);
  const duringLockRef = useRef(false);
  const boardRef = useRef(null);
  const spawnTimerRef = useRef(null);
  useEffect(() => { boardRef.current = board; }, [board]);
  const lockSeqRef = useRef(0);
  const processedSeqRef = useRef(0);

  const endNow = useCallback((reason = 'unknown') => {
    if (endedRef.current) return;
    endedRef.current = true;
    setGameOver(true);
    setGameOverReason(reason);
    try { if (onGameOverRef.current) onGameOverRef.current(reason); } catch (_) {}
  }, []);

  const spawn = useCallback((b) => {
    // Ensure we have an id available; extend queue synchronously for this read
    let q = queue;
    if (nextIdx >= q.length) {
      q = q.concat(randomBag7());
      setQueue(q);
    }
    const id = q[nextIdx];
    const piece = { id, rot: 0, x: spawnX, y: spawnY };
    const baseBoard = b != null ? b : boardRef.current || board;
    const collided = collides(baseBoard, piece);
    if (collided) { endNow('spawn'); return null; }
    setNextIdx((i) => i + 1);
    // Items: on spawn, optionally tag one cell of this piece as item for visual; we'll commit to board on lock
    if (enableItems && Math.random() < itemSpawnChance) {
      // choose an index within the piece's 4 blocks
      const idx = Math.floor(Math.random() * (SHAPES[id][0].length || 4));
      setCurrentItemPick(idx);
      return { ...piece, hasItem: true };
    } else {
      setCurrentItemPick(null);
    }
    return piece;
  }, [nextIdx, queue, enableItems, itemSpawnChance]);

  useEffect(() => {
    if (!current && !gameOver && !endedRef.current && !duringLockRef.current) {
      setCurrent((prev) => prev ?? spawn(board));
    }
  }, [board, current, gameOver, spawn]);

  // Keep queue ahead for previews
  useEffect(() => {
    if (gameOver) return;
    if (queue.length - nextIdx < 6) {
      setQueue((q) => (q.length - nextIdx < 6 ? q.concat(randomBag7()) : q));
    }
  }, [queue, nextIdx, gameOver]);

  const step = useCallback(() => {
    if (gameOver || !current) return;
    const down = { ...current, y: current.y + 1 };
    if (!collides(board, down)) {
      setCurrent(down);
      return;
    }
    // lock; if any part would lock above the top, it's game over (top-out)
    {
      const shape = SHAPES[current.id][current.rot];
      for (const [dx, dy] of shape) {
        if (current.y + dy < 0) { endNow('topout'); return; }
      }
    }
    // proceed to place the piece and resolve lines
    let merged = merge(board, current);
    // Prepare item layer update and awards BEFORE applying line clears
    let awardCount = 0;
    // Identify rows that will clear from the merged board
    const rowsToClear = [];
    for (let y = 0; y < ROWS; y++) if (merged[y].every((v) => v !== EMPTY)) rowsToClear.push(y);
    if (enableItems) {
      // Start from latest item board
      let ib = itemBoardRef.current || itemBoard;
      let work = ib.map((r) => r.slice());
      if (current && currentItemPick != null) {
        const shape = SHAPES[current.id][current.rot];
        const ii = Math.max(0, Math.min(currentItemPick, shape.length - 1));
        const [dx, dy] = shape[ii] || [0, 0];
        const x = current.x + dx, y = current.y + dy;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) work[y][x] = 1;
      }
      const res = findAndConsumeItemTriples(work);
      awardCount = res.awarded || 0;
      // Mirror line clears onto item layer result
      let ib2 = res.board.slice();
      for (let i = rowsToClear.length - 1; i >= 0; i--) ib2.splice(rowsToClear[i], 1);
      while (ib2.length < ROWS) ib2.unshift(Array(COLS).fill(0));
      setItemBoard(ib2);
    }
    const { board: clearedBoard, cleared } = clearLines(merged);
    if (cleared > 0) {
      const newLinesTotal = lines + cleared;
      setLines(newLinesTotal);
      const delta = [0, 100, 300, 500, 800][cleared] || cleared * 200;
      setScore((s) => s + delta);
      if (newLinesTotal % 10 === 0) setLevel((lv) => lv + 1);

      // combo / B2B tracking (Tetrises only for now)
      const eligible = (cleared === 4);
      const isB2B = b2bActive && eligible;
      const newCombo = combo + 1;
      setCombo(newCombo);
      setB2BActive(eligible ? true : false);

      // notify listeners (battle manager) with extra info
      try {
        if (onLinesClearedRef.current) onLinesClearedRef.current({ cleared, combo: newCombo, isB2B, eligible });
      } catch (_) {}
    } else {
      // no clear: break combo; keep b2bActive unchanged
      if (combo !== 0) setCombo(0);
    }
    duringLockRef.current = true;
    setBoard(clearedBoard);
    setCurrent(null);
    if (enableItems && awardCount > 0) {
      try { if (onItemAwardRef.current) onItemAwardRef.current(awardCount); } catch (_) {}
    }
    setCurrentItemPick(null);
    // Awarding already processed pre-clears above
    // Ensure soft-drop does not carry over to the next spawn
    setHoldSoftDrop(false);
    try { if (onLockRef.current) onLockRef.current({ cleared }); } catch (_) {}
    // Defer spawn until after any rise-on-lock garbage updates have committed
    clearTimeout(spawnTimerRef.current);
    spawnTimerRef.current = setTimeout(() => {
      setTimeout(() => {
        if (!endedRef.current && !gameOver) {
          setCurrent(spawn());
        }
        duringLockRef.current = false;
      }, 0);
    }, 0);
    setHoldUsed(false);
  }, [board, current, gameOver, lines, spawn, combo, b2bActive, enableItems, currentItemPick]);

  // gravity timer
  useEffect(() => {
    if (gameOver || paused) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(step, gravityMs);
    return () => clearInterval(timerRef.current);
  }, [gravityMs, step, gameOver, paused]);

  const tryMove = useCallback((dx) => {
    if (gameOver || paused || !current) return;
    const moved = { ...current, x: current.x + dx };
    if (!collides(board, moved)) setCurrent(moved);
  }, [board, current, gameOver, paused]);

  const hardDrop = useCallback(() => {
    if (gameOver || paused || !current) return;
    let p = current;
    while (!collides(board, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
    setCurrent(p);
    // Immediately lock on next tick
    step();
  }, [board, current, gameOver, paused, step]);

  const rotate = useCallback((dir = 1) => {
    if (gameOver || paused || !current) return;
    const prev = current;
    const r = tryRotate(board, prev, dir);
    setCurrent(r);
    // Keep d12 bound to the same local block through exact 4x4 rotation mapping
    if (enableItems && currentItemPick != null && r && (r.rot !== prev.rot)) {
      try {
        const step = ((r.rot - prev.rot) + 4) % 4; // 1..3 steps CW
        let idx = currentItemPick;
        if (step === 1) {
          idx = ITEM_INDEX_MAP[prev.id]?.[prev.rot]?.[idx] ?? idx;
        } else if (step === 2) {
          idx = ITEM_INDEX_MAP[prev.id]?.[prev.rot]?.[idx] ?? idx;
          idx = ITEM_INDEX_MAP[prev.id]?.[(prev.rot + 1) % 4]?.[idx] ?? idx;
        } else if (step === 3) {
          // effectively CCW one step: invert mapping
          // Build inverse quickly from next rotation
          const nextMap = ITEM_INDEX_MAP[prev.id]?.[(r.rot) % 4];
          if (nextMap && Array.isArray(nextMap)) {
            // nextMap maps r.rot -> (r.rot+1); we need mapping r.rot <- prev.rot
            // safer: chain CW three times
            idx = ITEM_INDEX_MAP[prev.id]?.[prev.rot]?.[idx] ?? idx;
            idx = ITEM_INDEX_MAP[prev.id]?.[(prev.rot + 1) % 4]?.[idx] ?? idx;
            idx = ITEM_INDEX_MAP[prev.id]?.[(prev.rot + 2) % 4]?.[idx] ?? idx;
          }
        }
        setCurrentItemPick(idx);
      } catch (_) {}
    }
  }, [board, current, gameOver, paused, enableItems, currentItemPick]);

  const applyPlanFast = useCallback((plan) => {
    if (!plan || gameOver || paused || !current) return;
    let p = { ...current };
    // apply rotations
    for (let i = 0; i < (plan.rotSteps || 0); i++) p = tryRotate(board, p, 1);
    // apply horizontal moves
    const dir = plan.moveDir || 0;
    const steps = plan.moveSteps || 0;
    for (let i = 0; i < steps; i++) {
      const moved = { ...p, x: p.x + dir };
      if (!collides(board, moved)) p = moved; else break;
    }
    setCurrent(p);
    // hard drop synchronously
    let q = p;
    while (!collides(board, { ...q, y: q.y + 1 })) q = { ...q, y: q.y + 1 };
    setCurrent(q);
    step();
  }, [board, current, gameOver, paused, step]);

  const addGarbage = useCallback((n, holeIdx = null) => {
    if (n <= 0 || gameOver) return;
    setBoard((b) => {
      let out = cloneBoard(b);
      for (let i = 0; i < n; i++) {
        const h = (holeIdx != null && holeIdx >= 0 && holeIdx < COLS)
          ? Math.floor(Math.random() * COLS) // even if a base hole is provided, randomize per line
          : Math.floor(Math.random() * COLS);
        const row = Array.from({ length: COLS }, (_, x) => (x === h ? EMPTY : 8));
        out.shift();
        out.push(row);
      }
      // Raise the active piece by the exact number of rows added, then adjust further if needed
      if (!duringLockRef.current && current) {
        let p = { ...current, y: current.y - n };
        let safety = n + 6; // allow moving above by a few rows if needed
        while (collides(out, p) && safety-- > 0) p = { ...p, y: p.y - 1 };
        if (!collides(out, p)) setCurrent(p);
        else { endNow('garbage'); }
      }
      return out;
    });
    // Keep itemBoard in sync with garbage rise
    if (enableItems) {
      setItemBoard((ib) => {
        let out = ib.map((r) => r.slice());
        for (let i = 0; i < n; i++) {
          out.shift();
          out.push(Array(COLS).fill(0));
        }
        return out;
      });
    }
  }, [current, gameOver, endNow]);

  const setOnLinesCleared = useCallback((cb) => {
    onLinesClearedRef.current = cb;
  }, []);

  const setOnGameOver = useCallback((cb) => {
    onGameOverRef.current = cb;
  }, []);

  const setOnLock = useCallback((cb) => {
    onLockRef.current = cb;
  }, []);

  // Hold is disabled for this game mode
  const holdPiece = useCallback(() => {
    return; // no-op
  }, []);

  const reset = useCallback(() => {
    setBoard(makeEmptyBoard());
    setCurrent(null);
    setQueue(randomBag7());
    setNextIdx(0);
    setScore(0);
    setLevel(0);
    setLines(0);
    setGameOver(false);
    setGameOverReason(null);
    setPaused(false);
    setHoldSoftDrop(false);
    onLinesClearedRef.current = null;
    onLockRef.current = null;
    onGameOverRef.current = null;
    onItemAwardRef.current = null;
    setHoldId(null);
    setHoldUsed(false);
    endedRef.current = false;
    duringLockRef.current = false;
    clearTimeout(spawnTimerRef.current);
    setItemBoard(makeEmptyBoard());
    setCurrentItemPick(null);
  }, []);

  const ghost = useMemo(() => {
    if (!current) return null;
    let p = { ...current };
    while (!collides(board, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
    return p;
  }, [board, current]);

  return {
    state: { board, current, ghost, score, level, lines, gameOver, gameOverReason, paused, holdId, next: queue.slice(nextIdx, nextIdx + 5), itemBoard, currentItemPick },
    actions: {
      moveLeft: () => tryMove(-1),
      moveRight: () => tryMove(1),
      rotateCW: () => rotate(1),
      rotateCCW: () => rotate(-1),
      hardDrop,
      setSoftDrop: setHoldSoftDrop,
      setPaused,
      reset,
      addGarbage,
      setOnLinesCleared,
      setOnGameOver,
      setOnLock,
      holdPiece,
      applyPlanFast,
      applyBomb: (cells = []) => {
        try {
          if (!Array.isArray(cells) || cells.length === 0) return;
          const cur = current;
          const curCells = [];
          if (cur) {
            const shape = SHAPES[cur.id][cur.rot] || [];
            for (const [dx, dy] of shape) curCells.push([cur.x + dx, cur.y + dy]);
          }
          setBoard((b) => {
            const out = b.map((r) => r.slice());
            for (const [x, y] of cells) {
              if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
                let overlaps = false;
                for (const [cx, cy] of curCells) { if (cx === x && cy === y) { overlaps = true; break; } }
                if (overlaps) continue;
                const v = out[y][x];
                if (v >= 1 && v <= 7) out[y][x] = EMPTY;
              }
            }
            return out;
          });
          if (enableItems) {
            setItemBoard((ib) => {
              const out = ib.map((r) => r.slice());
              for (const [x, y] of cells) {
                if (y >= 0 && y < ROWS && x >= 0 && x < COLS) out[y][x] = 0;
              }
              return out;
            });
          }
        } catch (_) {}
      },
      placeLogRow: (x, y, width = 4, id = 9) => {
        try {
          if (!Number.isFinite(x) || !Number.isFinite(y)) return;
          if (y < 0 || y >= ROWS) return;
          const w = Math.max(1, Math.min(width, COLS));
          const x0 = Math.max(0, Math.min(x, COLS - w));
          setBoard((b) => {
            const out = b.map((r) => r.slice());
            for (let dx = 0; dx < w; dx++) {
              const cx = x0 + dx;
              if (out[y] && out[y][cx] === EMPTY) out[y][cx] = id;
            }
            return out;
          });
          if (enableItems) {
            setItemBoard((ib) => {
              const out = ib.map((r) => r.slice());
              for (let dx = 0; dx < Math.max(1, Math.min(width, COLS)); dx++) {
                const cx = Math.max(0, Math.min(x + dx, COLS - 1));
                if (out[y]) out[y][cx] = 0;
              }
              return out;
            });
          }
        } catch (_) {}
      },
      setOnItemAward: (cb) => { onItemAwardRef.current = cb; },
    }
  };
}

// Find horizontal/vertical runs of >=3 and consume them; returns { board, awarded }
function findAndConsumeItemTriples(iboard) {
  const b = iboard.map((r) => r.slice());
  const marked = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  let award = 0;
  // Horizontal
  for (let y = 0; y < ROWS; y++) {
    let x = 0;
    while (x < COLS) {
      if (b[y][x]) {
        let x2 = x;
        while (x2 < COLS && b[y][x2]) x2++;
        const len = x2 - x;
        if (len >= 3) {
          const triples = Math.floor(len / 3);
          award += triples;
          // consume all in the run
          for (let k = x; k < x2; k++) marked[y][k] = 1;
        }
        x = x2;
      } else x++;
    }
  }
  // Vertical
  for (let x = 0; x < COLS; x++) {
    let y = 0;
    while (y < ROWS) {
      if (b[y][x]) {
        let y2 = y;
        while (y2 < ROWS && b[y2][x]) y2++;
        const len = y2 - y;
        if (len >= 3) {
          const triples = Math.floor(len / 3);
          award += triples;
          for (let k = y; k < y2; k++) marked[k][x] = 1;
        }
        y = y2;
      } else y++;
    }
  }
  if (award > 0) {
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (marked[y][x]) b[y][x] = 0;
  }
  return { board: b, awarded: award };
}

// Map a block index from one rotation to another using exact 4x4 grid rotation
// removed old rotation-math mapper; using precomputed ITEM_INDEX_MAP in Constants
