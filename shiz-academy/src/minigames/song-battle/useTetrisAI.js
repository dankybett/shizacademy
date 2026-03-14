import { COLS, ROWS, SHAPES, EMPTY } from './Constants';

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

function dropToRest(board, piece) {
  let p = { ...piece };
  while (!collides(board, { ...p, y: p.y + 1 })) p = { ...p, y: p.y + 1 };
  return p;
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
  for (let y = 0; y < ROWS; y++) if (board[y].every((v) => v !== EMPTY)) rows.push(y);
  if (rows.length === 0) return { board, cleared: 0 };
  const b = board.slice();
  for (const y of rows) b.splice(y, 1);
  while (b.length < ROWS) b.unshift(Array(COLS).fill(EMPTY));
  return { board: b, cleared: rows.length };
}

function evaluate(board) {
  // Heuristic similar to Dellacherie: aggregate height, holes, bumpiness, lines
  const heights = Array(COLS).fill(0);
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let seenBlock = false;
    for (let y = 0; y < ROWS; y++) {
      const v = board[y][x];
      if (v !== EMPTY) {
        if (!seenBlock) { heights[x] = ROWS - y; seenBlock = true; }
      } else if (seenBlock) {
        holes++;
      }
    }
  }
  let bumpiness = 0;
  for (let x = 0; x < COLS - 1; x++) bumpiness += Math.abs(heights[x] - heights[x + 1]);
  const aggregateHeight = heights.reduce((a, b) => a + b, 0);
  // weights tuned lightly; negative is better
  return 0.51066 * aggregateHeight + 0.35663 * holes + 0.184483 * bumpiness;
}

export default function useTetrisAI() {
  function bestMove(board, cur, opts = {}) {
    const noise = Number(opts.noise || 0);
    const topK = Math.max(1, Number(opts.topK || 1));
    if (!cur) return null;
    const candidates = [];
    for (let rot = 0; rot < 4; rot++) {
      const p0 = { id: cur.id, rot, x: 0, y: cur.y };
      // compute valid x span by scanning
      for (let x = -3; x < COLS; x++) {
        const p = { ...p0, x };
        if (collides(board, p)) continue;
        const landed = dropToRest(board, p);
        const merged = merge(board, landed);
        const { board: clearedBoard } = clearLines(merged);
        let score = evaluate(clearedBoard);
        if (noise !== 0) score += (Math.random() * 2 - 1) * noise;
        candidates.push({ score, rot, x: landed.x });
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.score - b.score);
    const pickIdx = Math.min(candidates.length - 1, Math.floor(Math.random() * Math.min(topK, candidates.length)));
    const best = candidates[pickIdx];
    // Translate into action plan: rotate to rot, move to x, hardDrop
    // Determine rotation delta (CW only for simplicity)
    const rotSteps = (best.rot - cur.rot + 4) % 4;
    // Determine horizontal direction
    const dx = best.x - cur.x;
    const moveDir = Math.sign(dx);
    const moveSteps = Math.abs(dx);
    return { rotSteps, moveDir, moveSteps };
  }

  return { bestMove };
}
