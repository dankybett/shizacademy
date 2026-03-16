// Song Battle (Tetris) constants and helpers

export const COLS = 10;
export const ROWS = 20;

// Cell values: 0 empty, 1..7 tetromino ids, 8 garbage
export const EMPTY = 0;

// Shapes defined as rotation states; each a list of [x,y] offsets
// Orientation origin is the top-left of a 4x4 box where pieces spawn.
export const SHAPES = {
  1: [ // I
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]],
  ],
  2: [ // J
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]],
  ],
  3: [ // L
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]],
  ],
  4: [ // O
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[2,1]],
  ],
  5: [ // S
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]],
  ],
  6: [ // T
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]],
  ],
  7: [ // Z
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]],
  ],
};

export const BLOCK_SRC = {
  1: '/art/tetrominoes/1.png',
  2: '/art/tetrominoes/2.png',
  3: '/art/tetrominoes/3.png',
  4: '/art/tetrominoes/4.png',
  5: '/art/tetrominoes/5.png',
  6: '/art/tetrominoes/6.png',
  7: '/art/tetrominoes/7.png',
  8: '/art/tetrominoes/8.png', // garbage
  9: '/art/tetrominoes/wood.png', // Griswald log
};

export const levelToGravityMs = (level) => {
  // Simple speed curve; can be tuned later
  const speeds = [800, 700, 600, 520, 450, 380, 330, 290, 260, 230, 200];
  return speeds[Math.min(level, speeds.length - 1)];
};

export const SOFT_DROP_MS = 55;

export const makeEmptyBoard = () => Array.from({ length: ROWS }, () => Array(COLS).fill(EMPTY));

export const randomBag7 = () => {
  const a = [1,2,3,4,5,6,7];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Precomputed index mapping for item overlay to stick to the same logical block across rotations.
// For each piece id and rotation r, ITEM_INDEX_MAP[id][r][i] gives the index in rotation r+1 (CW) corresponding to block i in rotation r.
const rotCW = ([x, y]) => [3 - y, x];
function computeCWMapForPiece(shapes) {
  const map = [];
  for (let r = 0; r < 4; r++) {
    const a = shapes[r];
    const b = shapes[(r + 1) % 4];
    // rotate A into A' in 4x4 space
    const ar = a.map(([x, y]) => rotCW([x, y]));
    // Try small translations to align to B best
    let best = { matches: -1, dx: 0, dy: 0 };
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        let m = 0;
        for (let i = 0; i < ar.length; i++) {
          const [x, y] = ar[i];
          for (let j = 0; j < b.length; j++) {
            const [bx, by] = b[j];
            if (bx === x + dx && by === y + dy) { m++; break; }
          }
        }
        if (m > best.matches) best = { matches: m, dx, dy };
      }
    }
    const out = [];
    for (let i = 0; i < ar.length; i++) {
      const [x, y] = ar[i];
      let targetIdx = -1;
      for (let j = 0; j < b.length; j++) {
        const [bx, by] = b[j];
        if (bx === x + best.dx && by === y + best.dy) { targetIdx = j; break; }
      }
      if (targetIdx === -1) {
        // fallback to nearest by manhattan
        let bestJ = 0, bestD = Infinity;
        for (let j = 0; j < b.length; j++) {
          const [bx, by] = b[j];
          const d = Math.abs((x + best.dx) - bx) + Math.abs((y + best.dy) - by);
          if (d < bestD) { bestD = d; bestJ = j; }
        }
        targetIdx = bestJ;
      }
      out.push(targetIdx);
    }
    map.push(out);
  }
  return map;
}

export const ITEM_INDEX_MAP = (() => {
  const m = {};
  for (const id of Object.keys(SHAPES)) {
    m[id] = computeCWMapForPiece(SHAPES[id]);
  }
  return m;
})();

