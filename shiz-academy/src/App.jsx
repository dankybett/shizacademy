import { useEffect, useMemo, useRef, useState } from "react";
const ROOM_HEIGHT = 260;
// Positive moves target down, negative moves up (in pixels, relative to room height)
const FLOOR_TARGET_Y_ADJUST_PX = -20;
// Feature flag: enable dice-based song system
const DICE_MODE = true;
// Optional: show persistent dice chips bar in room (we'll use animated roll FX instead)
const SHOW_DICE_BAR = false;
// Optional: show mini dice HUD top-left in the room
const SHOW_DICE_MINI = false;

const GENRES = ["Pop", "Rock", "EDM", "Hip-Hop", "Jazz", "Country", "R&B", "Metal", "Folk", "Synthwave"];
const THEMES = [
  "Love",
  "Heartbreak",
  "Freedom",
  "Party",
  "Rebellion",
  "Nostalgia",
  "Adventure",
  "Dreams",
  "Empowerment",
  "Melancholy",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Posters available in public assets
const POSTERS = Array.from({ length: 20 }, (_, i) => `/art/posters/poster${i+1}.png`);

// --- Events (schedule + effects) ---
// Event schema:
// { id, week, key, title, short, details, type: 'bonus'|'penalty'|'choice'|'info',
//   effect?: { fanMult?:number, payoutMult?:number, shopDiscount?:number, grantMoney?:number },
//   choices?: [ { label, effect }, { label, effect } ] }

function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rngFrom(seed) {
  let s = seed >>> 0;
  return () => {
    // xorshift32
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 0xFFFFFFFF;
  };
}

function genEventSchedule(performerName, startTs) {
  const base = `${performerName || 'Performer'}-${startTs || Date.now()}`;
  const rnd = rngFrom(hashSeed(base));
  const evs = [];
  const push = (week, key, title, short, details, type, effect, choices) => {
    evs.push({ id: `${key}-${week}`, week, key, title, short, details, type, effect, choices });
  };
  // Anchors
  push(3, 'grant', 'Arts Council Grant', 'Small grant awarded', 'You receive a small grant to support your music.', 'bonus', { grantMoney: 100 });
  push(6, 'festival', 'Local Festival Week', 'Crowds are buzzing', 'Local festival boosts turnout and payouts.', 'bonus', { fanMult: 1.2, payoutMult: 1.2 });
  push(12, 'sale', 'Shop Sale', 'Gear discounts all week', 'The shop is running a sale: rolls are cheaper.', 'bonus', { shopDiscount: 0.8 });
  push(20, 'festival', 'Summer Fest', 'Big crowds in town', 'Major festival boosts turnout and payouts.', 'bonus', { fanMult: 1.25, payoutMult: 1.25 });
  push(24, 'openmic', 'Open Mic Marathon', 'Pick your focus', 'Choose between quick cash or fan hype.', 'choice', undefined, [
    { label: 'Take tips (+\u00A3 60 now)', effect: { grantMoney: 60 } },
    { label: 'Hype it (fans x1.2 this week)', effect: { fanMult: 1.2 } },
  ]);
  push(28, 'sale', 'Shop Sale', 'Gear discounts all week', 'The shop is running a sale: rolls are cheaper.', 'bonus', { shopDiscount: 0.85 });
  push(34, 'festival', 'City Spotlight', 'Music week', 'Citywide spotlight increases turnout and payouts.', 'bonus', { fanMult: 1.3, payoutMult: 1.2 });
  // One random mild penalty (spaced after week 16)
  const randWeek = 16 + Math.floor(rnd() * 12); // 16..27
  push(randWeek, 'offweek', 'Off-Week', 'Crowds feel quiet', 'Lower than usual interest this week.', 'penalty', { fanMult: 0.9, payoutMult: 0.9 });
  // Sort by week
  evs.sort((a,b)=>a.week-b.week);
  // Finale marker on the last week for calendar visibility
  try {
    const MAX_WEEKS_LOCAL = 52; // keep in sync with MAX_WEEKS
    // Week 51 reminder: final chance before the celebration
    push(MAX_WEEKS_LOCAL - 1, 'finalchance', 'Final Chance', "This is your final chance to make a song before Katie's Birthday Celebration.", "This is your final chance to make a song before Katie's Birthday Celebration.", 'info');
    evs.push({ id:`katie-${MAX_WEEKS_LOCAL}`, week: MAX_WEEKS_LOCAL, key:'katie', title:"Katie's Birthday Celebration", short:'Finale', details:"Choose a favorite song to perform at Katie's Birthday Party!", type:'info' });
    evs.sort((a,b)=>a.week-b.week);
  } catch(_) {}
  return evs;
}

function mergeEffects(eventsForWeek) {
  const eff = { fanMult: 1, payoutMult: 1, shopDiscount: 1 };
  (eventsForWeek||[]).forEach(e => {
    if (e && e.effect) {
      if (typeof e.effect.fanMult === 'number') eff.fanMult *= e.effect.fanMult;
      if (typeof e.effect.payoutMult === 'number') eff.payoutMult *= e.effect.payoutMult;
      if (typeof e.effect.shopDiscount === 'number') eff.shopDiscount *= e.effect.shopDiscount;
      if (typeof e.effect.grantMoney === 'number') eff.grantMoney = (eff.grantMoney||0) + e.effect.grantMoney;
    }
  });
  return eff;
}

function effectSummary(eff) {
  const parts = [];
  if ((eff.fanMult||1) !== 1) parts.push(`Fans x${(eff.fanMult||1).toFixed(2)}`);
  if ((eff.payoutMult||1) !== 1) parts.push(`Payout x${(eff.payoutMult||1).toFixed(2)}`);
  if ((eff.shopDiscount||1) !== 1) parts.push(`Shop x${(eff.shopDiscount||1).toFixed(2)}`);
  if (eff.grantMoney) parts.push(`+\u00A3${eff.grantMoney} now`);
  return parts.join(' - ');
}

// Build 5 lightweight fan comments for a release entry
function generateFanComments(entry, performerName) {
  try {
    const name = performerName || 'You';
    const grade = entry?.grade || 'C';
    const title = entry?.songName || 'your song';
    const genre = entry?.genre;
    const theme = entry?.theme;
    const chart = entry?.chartPos;
    const score = entry?.score;
    const poolA = [
      `On repeat! ${title} is unreal.`,
      `Chills. ${name} absolutely delivered.`,
      `That hook is living rent-free in my head.`,
      `Peak ${genre}! Chef's kiss.`,
      `Instant fave - can't stop humming it.`,
    ];
    const poolB = [
      `Big step up - love the vibe.`,
      `This chorus hits just right.`,
      `Such a cool ${theme?.toLowerCase?.()||'mood'} energy.`,
      `Solid track - more please!`,
      `Clever lyrics and a catchy groove.`,
    ];
    const poolC = [
      `I like this direction!`,
      `Can't wait to hear it live.`,
      `Nice blend of styles.`,
      `This will grow on people.`,
      `Proud of the grind - keep going!`,
    ];
    const topNote = chart && chart <= 10 ? [`Top ${chart}! Legends in the making.`] : [];
    const pickN = (arr, n) => {
      const res = [];
      const tmp = arr.slice();
      for (let i=0; i<n && tmp.length>0; i++) {
        const idx = randInt(0, tmp.length-1);
        res.push(tmp[idx]);
        tmp.splice(idx,1);
      }
      return res;
    };
    let base = poolC;
    if (grade === 'B') base = poolB;
    if (grade === 'A' || grade === 'S' || grade === 'Masterpiece') base = poolA;
    const main = pickN(base, 4 - topNote.length);
    const merged = [...topNote, ...main];
    while (merged.length < 5) merged.push('Loving the growth each week!');
    return merged.slice(0,5);
  } catch (_) {
    return ['Great track!', 'Love the vibe', 'On repeat', "Can't wait for next", 'Keep going!'];
  }
}

// --- Global Trends (Top 5) ---
const TREND_ARTISTS = [
  'The Dillamond Dogs','Siren Soft-Step','Barnaby & The Beets','Lulu Lullaby','The Mossy Stones',
  'Echo Mirage','Velvet Voltage','Neon Orchard','Crystal Caravan','Paper Suns',
  'Golden Kites','Silver Harbor','Midnight Marmalade','Soft Static','Azure Bloom'
];
const TREND_TITLES = [
  'Barking at the Pastel Moon','Dewdrop Symphony','Root Vegetable Blues','One More Nap','Rolling Down the Hill',
  'City of Polaroids','Velvet Parachute','Northern Kite','Slow Glow','Soda Skies',
  'Cloud Arcade','Lemon Nebula','Pocket Stardust','Sandy Echoes','Hollow Candies'
];

function pick(arr, r) { return arr[Math.floor(r()*arr.length)] }

// Build a lowercase file-safe slug (for audio filenames)
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function genTrendsForWeek(week, performerName, seedTs, audioTracks) {
  const rnd = rngFrom(hashSeed(`${performerName||'Performer'}|${seedTs||0}|W${week}`));
  const items = [];
  const useAudio = Array.isArray(audioTracks) && audioTracks.length > 0;
  if (useAudio) {
    // Sample up to 5 unique tracks from manifest using seeded RNG
    const idxs = new Set();
    const total = audioTracks.length;
    const count = Math.min(5, total);
    while (idxs.size < count) idxs.add(Math.floor(rnd()*total));
    Array.from(idxs).forEach((i) => {
      const t = audioTracks[i];
      const base = 75 + Math.floor(rnd()*18) + Math.floor((week/52)*4);
      items.push({ rank: items.length+1, artist: t.artist, title: t.title, score: base, isPlayer:false, audioSources: t.sources, cover: t.cover });
    });
  } else {
    for (let i=0;i<5;i++) {
      const artist = pick(TREND_ARTISTS, rnd);
      const title = pick(TREND_TITLES, rnd);
      const base = 75 + Math.floor(rnd()*18) + Math.floor((week/52)*4);
      items.push({ rank:i+1, artist, title, score: base, isPlayer:false });
    }
  }
  items.sort((a,b)=>b.score-a.score).forEach((it,idx)=>it.rank=idx+1);
  return items;
}

// --- Fan avatars (spritesheet) ---
const FAN_SPRITE = { path: '/art/socialmediaprofilepics.png', cols: 10, rows: 10, pad: 20 };
function fanIdxFor(week, i, seedTs){
  const total = (FAN_SPRITE.cols||10) * (FAN_SPRITE.rows||10);
  const h = hashSeed(`${seedTs||0}|fan|${week}|${i}`);
  return h % total;
}
function fanAvatarStyle(idx, size=24, meta){
  const c = FAN_SPRITE.cols||10; const r = FAN_SPRITE.rows||10; const pad = FAN_SPRITE.pad||0;
  const x = Math.max(0, idx % c); const y = Math.max(0, Math.floor(idx / c));
  // If we have image meta (natural w/h), compute pixel-accurate background offset including padding
  if (meta && meta.w && meta.h && typeof meta.tileW === 'number' && typeof meta.tileH === 'number') {
    const scale = size / Math.max(1, meta.tileW);
    const left = pad + x * (meta.tileW + pad);
    const top  = pad + y * (meta.tileH + pad);
    return {
      width: size, height: size, borderRadius: 6,
      backgroundImage: `url('${FAN_SPRITE.path}')`,
      backgroundSize: `${meta.w * scale}px ${meta.h * scale}px`,
      backgroundPosition: `-${left * scale}px -${top * scale}px`,
      backgroundRepeat: 'no-repeat',
      border: '1px solid rgba(255,255,255,.15)',
      backgroundColor: 'rgba(255,255,255,.08)'
    };
  }
  // Fallback: percent-based grid without padding awareness
  const xPct = c>1 ? (x/(c-1))*100 : 0; const yPct = r>1 ? (y/(r-1))*100 : 0;
  return {
    width: size, height: size, borderRadius: 6,
    backgroundImage: `url('${FAN_SPRITE.path}')`,
    backgroundSize: `${c*100}% ${r*100}%`,
    backgroundPosition: `${xPct}% ${yPct}%`,
    backgroundRepeat: 'no-repeat',
    border: '1px solid rgba(255,255,255,.15)',
    backgroundColor: 'rgba(255,255,255,.08)'
  };
}

// Compatibility hints: -1 (risky), 0 (okay), +1 (great)
// Unlisted pairs default to 0
const COMPAT = {
  Pop: {
    Love: 1,
    Heartbreak: 1,
    Party: 1,
    Empowerment: 1,
    // More swingy risky pairs
    Rebellion: -1,
    Adventure: -1,
    Nostalgia: 0,
    Melancholy: 0,
  },
  Rock: {
    Rebellion: 1,
    Freedom: 1,
    Empowerment: 1,
    // Risky contrasts
    Dreams: -1,
    Nostalgia: -1,
    Love: 0,
    Heartbreak: 0,
    Party: 0,
    Melancholy: 0,
  },
  EDM: {
    Party: 1,
    Freedom: 0,
    Love: -1,
    Dreams: 0,
    Adventure: 1,
    Melancholy: -1,
  },
  "Hip-Hop": {
    Rebellion: 1,
    Empowerment: 1,
    Party: 1,
    // Risky: introspective/dreamy themes
    Dreams: -1,
    Melancholy: -1,
    Love: 0,
    Heartbreak: 0,
    Nostalgia: 0,
  },
  Jazz: {
    Love: 1,
    Melancholy: 1,
    Nostalgia: 1,
    Party: -1,
    Rebellion: -1,
  },
  Country: {
    Heartbreak: 1,
    Love: 1,
    Adventure: 1,
    Party: -1,
    Rebellion: -1,
  },
  "R&B": {
    Love: 1,
    Heartbreak: 1,
    Dreams: 1,
    Rebellion: -1,
    Freedom: -1,
  },
  Metal: {
    Rebellion: 1,
    Freedom: 1,
    Love: -1,
    Party: -1,
    Melancholy: 0,
  },
  Folk: {
    Nostalgia: 1,
    Adventure: 1,
    Dreams: 1,
    Party: -1,
    Empowerment: -1,
  },
  Synthwave: {
    Nostalgia: 1,
    Dreams: 1,
    Party: 1,
    Empowerment: -1,
    Heartbreak: -1,
    Melancholy: 0,
  },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function gradeFromScore(score) {
  if (score >= 94) return "S";
  if (score >= 82) return "A";
  if (score >= 72) return "B";
  if (score >= 62) return "C";
  return "D";
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pair bonus algorithm constants
const COMPAT_BONUS_GOOD = 6;
const RISKY_BIG_BOOST = 12;
const RISKY_PENALTY = 8;

function computePairBonus(genre, theme, randomize = false) {
  const rating = (COMPAT[genre] && COMPAT[genre][theme]) ?? 0;
  if (rating > 0) return COMPAT_BONUS_GOOD;
  if (rating === 0) return 0;
  // Risky: 1/4 chance big boost; otherwise penalty
  if (!randomize) {
    // Expected value used for forecasts
    return Math.round(0.25 * RISKY_BIG_BOOST - 0.75 * RISKY_PENALTY);
  }
  const roll = randInt(1, 4);
  return roll === 1 ? RISKY_BIG_BOOST : -RISKY_PENALTY;
}

// Swingier, release-time only bonus based on weakest roll quality
// s, w, p are inverted normalized dice results in [0,1], higher = better
function computePairSwingBonus(compat, s, w, p) {
  const q = Math.min(s || 0, w || 0, p || 0); // weakest link
  const a = ((s || 0) + (w || 0) + (p || 0)) / 3; // average
  const good = q >= 0.74 && a >= 0.78;
  const mid = !good && q >= 0.45; // anything above bad but not meeting good gate
  // const bad = !good && !mid;
  if (compat < 0) {
    if (good) return 12;
    if (mid) return -10;
    return -14;
  } else if (compat === 0) {
    if (good) return 3;
    if (mid) return 0;
    return -6;
  } else {
    // compat > 0 (great)
    if (good) return 6;
    if (mid) return 4;
    return 2;
  }
}

function computeChartPosition(score, fans) {
  const base = 120 - score; // higher score -> better (lower) position
  const fanBoost = Math.min(40, Math.floor(Math.log10((fans || 0) + 10) * 14));
  const noise = randInt(-3, 3);
  const raw = Math.round(base - fanBoost + noise);
  return clamp(raw, 1, 100);
}

function buildFeedback({ vocals, writing, stage, practiceT, writeT, performT, compat, genre, theme, songHistory, score }) {
  const tips = [];
  // (Compatibility advice removed to encourage discovery)
  // Triad contribution breakdown
  const mel = practiceT * (1 + vocals / 12) * 8;
  const lyr = writeT * (1 + writing / 12) * 8;
  const per = performT * (1 + stage / 12) * 8;
  const min = Math.min(mel, lyr, per);
  if (min === mel) tips.push("Improve singing & spend more days composing (melody).");
  if (min === lyr) tips.push("Improve writing & spend more days on lyrics.");
  if (min === per) tips.push("Improve stage presence & spend more days rehearsing.");
  // Time allocation nudges
  if (writeT < 3) tips.push("Dedicate more time to writing this week.");
  if (performT < 3) tips.push("Dedicate more time to performance this week.");

  // Similarity to previous song
  if (songHistory && songHistory.length > 0) {
    const prev = songHistory[0];
    if (prev && prev.genre === genre && prev.theme === theme) {
      tips.push("Too similar to last release \u2014 try varying genre or theme.");
    }
  }
  return tips;
}

const REVIEW_LINES = {
  Masterpiece: [
    "A once-in-a-generation masterpiece!",
    "Unbelievable perfection \u2014 instant legend.",
    "A timeless classic \u2014 pure magic.",
  ],
  S: ["Instant classic!", "A career-defining hit!", "You owned the stage."],
  A: ["Strong release - fans will love it.", "A big step up!", "This one has real sparkle."],
  B: ["Solid track with potential.", "Good, but could be sharper.", "Nice vibe - keep going."],
  C: ["Decent effort, needs polish.", "Some good ideas, uneven execution.", "Not bad - practice will help."],
  D: ["Rough around the edges.", "This didn't land with critics.", "Back to the drawing board."],
};

// Venues: early-game risk tiers
const VENUES = {
  busking: {
    name: "Busking",
    icon: "",
    cost: 0,
    breakEven: 45,
    payoutPerPoint: 0.8,
    fanMult: 0.6,
    rng: 1,
    tipFloor: 5,
    desc: "Free, safe and humble. Great to learn and earn a little.",
  },
  ozdustball: {
    name: "Ozdust Ball",
    icon: "",
    cost: 20,
    breakEven: 60,
    payoutPerPoint: 1.3,
    fanMult: 1.1,
    rng: 2,
    desc: "Lively hall. Profitable with solid songs.",
  },
  stadium: {
    name: "Stadium",
    icon: "",
    cost: 500,
    breakEven: 85,
    payoutPerPoint: 2.2,
    fanMult: 2.2,
    rng: 4,
    desc: "Massive scale. All or nothing.",
  },
};

const VENUE_BG = {
  busking: '/art/venue1_busking.png',
  ozdustball: '/art/venue2_ozdustball.png',
  stadium: '/art/venue3_stadium.png',
  katieparty: '/art/katieparty.png',
};

const VENUE_FAN_REQ = { busking: 0, ozdustball: 50, stadium: 1000 };
const MAX_GIGS_PER_WEEK = 3;

function pickReview(grade) {
  const arr = REVIEW_LINES[grade] ?? ["..."];
  return arr[randInt(0, arr.length - 1)];
}

export default function App() {
  // Run settings
  const MAX_WEEKS = 52;

  // Game state
  const [week, setWeek] = useState(1);
  const [money, setMoney] = useState(0);
  const [fans, setFans] = useState(0);

  // Performer stats (0-10)
  const [vocals, setVocals] = useState(2);
  const [writing, setWriting] = useState(2);
  const [stage, setStage] = useState(2);

  // Choices
  const [genre, setGenre] = useState(GENRES[0]);
  const [theme, setTheme] = useState(THEMES[0]);
  const [songName, setSongName] = useState("");
  const [conceptLocked, setConceptLocked] = useState(false);

  // Time allocation via instructions (4 days per week)
  const TOTAL_TIME = 4;
  const [practiceT, setPracticeT] = useState(0);
  const [writeT, setWriteT] = useState(0);
  const [performT, setPerformT] = useState(0);

  const [actions, setActions] = useState([]); // sequence of { t: 'practice'|'write'|'perform', d: number }
  const [lastResult, setLastResult] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState("Ready to work!");
  const [statsOpen, setStatsOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [songHistory, setSongHistory] = useState([]);
  const [venueOpen, setVenueOpen] = useState(false);
  const [finishedReady, setFinishedReady] = useState(false);
  const [gigOpen, setGigOpen] = useState(false);
  const [selectedGigSong, setSelectedGigSong] = useState(null);
  const [gigResultOpen, setGigResultOpen] = useState(false);
  const [gigResult, setGigResult] = useState(null); // {venue, money, fans}
  const [weekMode, setWeekMode] = useState(null); // 'song' | 'gig' | null
  const [progressOpen, setProgressOpen] = useState(false);
  const [roomWidth, setRoomWidth] = useState(520);
  const [walkablePts, setWalkablePts] = useState([]);
  const [facingLeft, setFacingLeft] = useState(false);
  const [isPerforming, setIsPerforming] = useState(false);
  const [performingVenue, setPerformingVenue] = useState(null);
  const [performingSong, setPerformingSong] = useState(null); // snapshot { name, genre, theme } for venue performance HUD
  const performAudioRef = useRef(null);
  const rollAudioRef = useRef(null);
  const typingAudioRef = useRef(null);
  const danceAudioRef = useRef(null);
  const dancePreviewAudioRef = useRef(null); // plays top-trend 5s snippet during perform roll
  const dancePreviewPlayingKeyRef = useRef(null); // track id set by preview to clear HUD later
  const dancePreviewActiveRef = useRef(false); // HUD was set by dance preview
  const [socialOpen, setSocialOpen] = useState(false);
  const [myMusicOpen, setMyMusicOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Friends / Visual Novel system
  const [friends, setFriends] = useState({ luminaO: { level: 0, rewardsClaimed: {}, posterUnlocked: false, bio: { title: 'Lumina-O', summary: 'Synthwave artist with neon-smooth vibes.', bullets: ['Loves late-night mixes', 'Champions consistency', 'Gives practical tips'] } } });
  const [pendingFriendEvents, setPendingFriendEvents] = useState([]); // [{ friendId:'luminaO', targetLevel:number, week:number }]
  const [friendModal, setFriendModal] = useState({ open:false, friendId:null, targetLevel:null, idx:0 });
  const [vnTyping, setVnTyping] = useState(false);
  const [vnTypingTick, setVnTypingTick] = useState(0);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState(null);
  const [lastFriendProgressWeek, setLastFriendProgressWeek] = useState(0);
  const [friendMilestones, setFriendMilestones] = useState({ luminaO: { hit20Week: null, hit50Week: null } });
  // Finale flow state
  const [finalePending, setFinalePending] = useState(false);
  const [finaleOpen, setFinaleOpen] = useState(false);
  const [finaleSummaryOpen, setFinaleSummaryOpen] = useState(false);
  const [finaleEndOpen, setFinaleEndOpen] = useState(false);
  const [finaleSong, setFinaleSong] = useState(null);
  const [suppressFinale, setSuppressFinale] = useState(false); // allow continuing play without further finales
  const [releaseWasShown, setReleaseWasShown] = useState(false);
  const [finaleInProgress, setFinaleInProgress] = useState(false);
  const [endYearReady, setEndYearReady] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopAnim, setShopAnim] = useState(false);
  const [earlyFinishEnabled, setEarlyFinishEnabled] = useState(true);
  const [performerName, setPerformerName] = useState('Your Performer');
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [mirrorAnim, setMirrorAnim] = useState(false);
  const [pairFeedback, setPairFeedback] = useState(null); // 'great combination' | 'okay combination' | 'risky combination' | null
  // If set, the next roll (one action) will use these faces and buttons reflect this temporarily
  const [nextRollOverride, setNextRollOverride] = useState(null); // 20 | 12 | 6 | null
  // Dice mode state (per week)
  const [rollBest, setRollBest] = useState({ sing: null, write: null, perform: null });
  const [rollHistory, setRollHistory] = useState([]); // {day, action, value, faces}
  const [prevFaces, setPrevFaces] = useState({ sing: facesFor(0), write: facesFor(0), perform: facesFor(0) });
  const [toasts, setToasts] = useState([]); // {id, text}
  const [rollFx, setRollFx] = useState({ show:false, faces:0, current:null, final:null, settled:false, action:null });
  const [rollFxFadeOut, setRollFxFadeOut] = useState(false);
  const [rollFxPulse, setRollFxPulse] = useState(false);
  const [rollRing, setRollRing] = useState({ show:false, action:null, color:null });
  const [rollGlow, setRollGlow] = useState({ sing: null, write: null, perform: null });
  const [bubbleGlow, setBubbleGlow] = useState({ show:false, color:null });
  const [celebrateFx, setCelebrateFx] = useState({ show:false, text:'', color:'#fff', startX:0, startY:0, phase:'start', key:0 });
  const [rollFxHoldMs, setRollFxHoldMs] = useState(2500);

  // Events state
  const [eventsSchedule, setEventsSchedule] = useState(null); // array of events
  const [eventsResolved, setEventsResolved] = useState({}); // id -> { status:'resolved'|'choice', choiceIndex? }
  const [eventModal, setEventModal] = useState(null); // { event, pendingChoice: true|false }
  const [eventInfoModal, setEventInfoModal] = useState(null); // { events: [event,...] }
  // Posters: unlocked indices into POSTERS and current selection
  const [unlockedPosters, setUnlockedPosters] = useState([]); // number[]
  const [currentPosterIdx, setCurrentPosterIdx] = useState(null); // number | null
  const [posterOpen, setPosterOpen] = useState(false);
  const [queuedEventInfo, setQueuedEventInfo] = useState(null); // { events }
  const [weeklyInfoShownWeek, setWeeklyInfoShownWeek] = useState(0);
  const [welcomeShown, setWelcomeShown] = useState(false);

  // Trends state
  const [seedTs, setSeedTs] = useState(null);
  const [trendsByWeek, setTrendsByWeek] = useState({}); // week -> TrendItem[]
  const [audioTracks, setAudioTracks] = useState([]); // [{artist,title,sources:[url,...], cover?:string}]
  const [playingTrend, setPlayingTrend] = useState(null); // { key, artist, title }
  const audioRef = useRef(null);
  const [audioTime, setAudioTime] = useState({ current: 0, duration: 0 });
  const [fanSpriteMeta, setFanSpriteMeta] = useState(null); // { w,h,tileW,tileH }

  function facesFor(stat) {
    // Simplified path: d20 -> d12 -> d6
    if (stat >= 9.9) return 6;
    if (stat >= 6) return 12;
    return 20;
  }
  function rollDie(faces) {
    return Math.max(1, Math.floor(Math.random() * faces) + 1);
  }
  const singAudioRef = useRef(null);

  // --- Friends/VN helpers ---
  function enqueueFriendEvent(friendId, targetLevel){
    setPendingFriendEvents(prev => {
      const curr = friends?.[friendId]?.level || 0;
      if (targetLevel <= curr) return prev;
      if (prev.some(ev => ev.friendId===friendId && ev.targetLevel===targetLevel)) return prev;
      const next = [...prev, { friendId, targetLevel, week }];
      next.sort((a,b)=> (a.week - b.week) || (a.targetLevel - b.targetLevel));
      return next;
    });
  }

  function checkFriendCriteria(){
    // Lumina-O template
    const lumLevel = friends?.luminaO?.level || 0;
    const synthSongs = (songHistory||[]).filter(s => (s.genre||'').toLowerCase() === 'synthwave');
    const hasSynth = synthSongs.length > 0;
    const latestSynthWeek = synthSongs.reduce((max, s) => Math.max(max, s.releaseWeek||0), 0);
    const hasTop5Synth = synthSongs.some(s => (s.chartPos||999) <= 5);
    const hasTop1Synth = synthSongs.some(s => (s.chartPos||999) === 1);
    if (lumLevel < 1 && hasSynth) enqueueFriendEvent('luminaO', 1);
    const hit20 = friendMilestones?.luminaO?.hit20Week || null;
    const hit50 = friendMilestones?.luminaO?.hit50Week || null;
    if (lumLevel < 2 && hit20 != null && latestSynthWeek > hit20) enqueueFriendEvent('luminaO', 2);
    if (lumLevel < 3 && hit50 != null && latestSynthWeek > hit50) enqueueFriendEvent('luminaO', 3);
    if (lumLevel < 4 && hasTop5Synth) enqueueFriendEvent('luminaO', 4);
    if (lumLevel < 5 && hasTop1Synth) enqueueFriendEvent('luminaO', 5);
  }

  useEffect(() => { checkFriendCriteria(); }, [week, fans, songHistory, trendsByWeek]);
  // Track milestone weeks when fans cross thresholds
  useEffect(() => {
    setFriendMilestones(prev => {
      const next = { ...prev, luminaO: { ...(prev.luminaO||{ hit20Week:null, hit50Week:null }) } };
      if (fans >= 20 && (next.luminaO.hit20Week == null)) next.luminaO.hit20Week = week;
      if (fans >= 50 && (next.luminaO.hit50Week == null)) next.luminaO.hit50Week = week;
      return next;
    });
  }, [fans, week]);

  // VN typing effect: brief animated ellipsis before each line
  useEffect(() => {
    if (!friendModal.open) return;
    setVnTyping(true);
    setVnTypingTick(0);
    const int = setInterval(() => setVnTypingTick(t => (t + 1) % 3), 250);
    const to = setTimeout(() => { setVnTyping(false); clearInterval(int); }, 900);
    return () => { clearInterval(int); clearTimeout(to); };
  }, [friendModal.open, friendModal.idx, friendModal.targetLevel]);
  const lastSingSfxAtRef = useRef(0);
  function playSingSfx() {
    try {
      const now = Date.now();
      // Guard: avoid double-triggering within a short window
      if (now - (lastSingSfxAtRef.current || 0) < 250) return;
      lastSingSfxAtRef.current = now;
      // Stop any existing clip
      if (singAudioRef.current) {
        try { singAudioRef.current.pause(); } catch (_) {}
      }
      const idx = 1 + Math.floor(Math.random() * 6);
      const audio = new Audio(`/sounds/singing${idx}.ogg`);
      audio.volume = 0.6;
      singAudioRef.current = audio;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  // Try to play a 5s faded preview of the #1 Global Trend track for the current week
  function playDancePreviewFromTopTrend() {
    try {
      const list = trendsByWeek && trendsByWeek[week];
      if (!list || list.length === 0) return false;
      const top = (list.find(it => it.rank === 1) || list[0]);
      if (!top) return false;
      const id = `${top.artist}__${top.title}`;
      const slug = slugify(`${top.artist} ${top.title}`);
      const sources = Array.isArray(top.audioSources) && top.audioSources.length
        ? top.audioSources
        : [ `/audio/${slug}.mp3`, `/audio/${slug}.ogg` ];
      let i = 0;

      const tryNext = () => {
        if (i >= sources.length) return false;
        const src = sources[i++];
        try { if (dancePreviewAudioRef.current) { dancePreviewAudioRef.current.pause(); dancePreviewAudioRef.current = null; } } catch (_) {}
        const a = new Audio(src);
        a.loop = false;
        a.volume = 0;
        let stopped = false;
        let fadeInTimer = null, fadeOutTimer = null, fadeInInt = null, fadeOutInt = null, stopTimer = null, safetyStopTimer = null;
        const idLocal = id;
        a.onended = () => {
          try {
            if (dancePreviewActiveRef.current) {
              setPlayingTrend(() => null);
            }
            dancePreviewPlayingKeyRef.current = null;
            dancePreviewActiveRef.current = false;
          } catch (_) {}
        };
        a.onloadedmetadata = () => {
          try {
            const totalMs = 5000;
            const fadeInMs = 600;
            const fadeOutMs = 700;
            const holdMs = Math.max(0, totalMs - fadeInMs - fadeOutMs);
            const dur = (isFinite(a.duration) && a.duration > 0) ? a.duration : 0;
            const windowSec = 5;
            const start = (dur > windowSec + 0.5) ? Math.max(0, Math.random() * (dur - windowSec)) : 0;
            try { a.currentTime = start; } catch (_) {}
            a.play().then(()=>{
              // Indicate Now Playing in HUD while preview rolls
              dancePreviewPlayingKeyRef.current = id;
              dancePreviewActiveRef.current = true;
              setPlayingTrend({ id, artist: top.artist, title: top.title });
            }).catch(() => {});
            if (safetyStopTimer) { clearTimeout(safetyStopTimer); safetyStopTimer = null; }
            // Fade in
            const target = 0.8; const tick = 50;
            let v = 0; a.volume = 0;
            fadeInInt = setInterval(() => {
              if (stopped) return clearInterval(fadeInInt);
              v += target * (tick / fadeInMs);
              a.volume = Math.min(target, v);
              if (a.volume >= target - 0.01) { a.volume = target; clearInterval(fadeInInt); }
            }, tick);
            // Fade out start after fade-in + hold
            fadeOutTimer = setTimeout(() => {
              let vv = a.volume;
              fadeOutInt = setInterval(() => {
                if (stopped) return clearInterval(fadeOutInt);
                vv -= target * (tick / fadeOutMs);
                a.volume = Math.max(0, vv);
                if (a.volume <= 0.01) { a.volume = 0; clearInterval(fadeOutInt); }
              }, tick);
            }, fadeInMs + holdMs);
            // Stop at total window
            stopTimer = setTimeout(() => {
              stopped = true; try { a.pause(); } catch (_) {}
              try { if (dancePreviewAudioRef.current === a) dancePreviewAudioRef.current = null; } catch (_) {}
              try {
                if (dancePreviewActiveRef.current) {
                  setPlayingTrend(() => null);
                }
                dancePreviewPlayingKeyRef.current = null;
                dancePreviewActiveRef.current = false;
              } catch (_) {}
              if (fadeInInt) clearInterval(fadeInInt);
              if (fadeOutInt) clearInterval(fadeOutInt);
              if (fadeInTimer) clearTimeout(fadeInTimer);
              if (fadeOutTimer) clearTimeout(fadeOutTimer);
              if (stopTimer) clearTimeout(stopTimer);
            }, totalMs);
          } catch (_) {}
        };
        a.onerror = () => { tryNext(); };
        dancePreviewAudioRef.current = a;
        // Safety fallback: if metadata never fires, still show HUD and stop after ~5.3s
        a.play().then(() => {
          if (!dancePreviewPlayingKeyRef.current) {
            dancePreviewPlayingKeyRef.current = idLocal;
            dancePreviewActiveRef.current = true;
            setPlayingTrend({ id: idLocal, artist: top.artist, title: top.title });
          }
          safetyStopTimer = setTimeout(() => {
            try { a.pause(); } catch (_) {}
            try { if (dancePreviewAudioRef.current === a) dancePreviewAudioRef.current = null; } catch (_) {}
            try {
              if (dancePreviewActiveRef.current) {
                setPlayingTrend(() => null);
              }
              dancePreviewPlayingKeyRef.current = null;
              dancePreviewActiveRef.current = false;
            } catch (_) {}
          }, 5300);
        }).catch(() => {});
        return true;
      };
      return tryNext();
    } catch (_) { return false; }
  }
  const [started, setStarted] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showConcept, setShowConcept] = useState(false);

  // Tamagotchi-style actor state
  const [pos, setPos] = useState({ x: 30, y: 70 }); // percentages within room
  const [target, setTarget] = useState(null); // {x,y} or null
  const [pendingAct, setPendingAct] = useState(null); // 'practice' | 'write' | 'perform' | null
  const [activity, setActivity] = useState("idle"); // 'idle' | 'walk' | 'write' | 'sing' | 'dance'

  const compat = COMPAT[genre]?.[theme] ?? 0;

  // Bonus rolls purchased this week
  const [bonusRolls, setBonusRolls] = useState(0);
  // Single-use die improvement items
  const [nudges, setNudges] = useState(0);

  const totalRolls = useMemo(() => TOTAL_TIME + (bonusRolls || 0), [bonusRolls]);
  const remaining = useMemo(() => totalRolls - actions.length, [actions, totalRolls]);

  // Track training gains within the current week (for UI + undo/clear)
  const [weekVocGain, setWeekVocGain] = useState(0);
  const [weekWriGain, setWeekWriGain] = useState(0);
  const [weekStageGain, setWeekStageGain] = useState(0);

  function diminishFactor(nth) {
    // Smooth diminishing: 0.85^(n-1), floor to 0.2 minimum effectiveness (slower leveling)
    return Math.max(0.2, Math.pow(0.85, Math.max(0, nth - 1)));
  }

  const allDiceSet = useMemo(() => !!(rollBest?.sing && rollBest?.write && rollBest?.perform), [rollBest]);
  const canRelease = (remaining === 0 || (DICE_MODE && earlyFinishEnabled && allDiceSet)) && week <= MAX_WEEKS;

  const gains = useMemo(() => ({
    vocals: +weekVocGain.toFixed(1),
    writing: +weekWriGain.toFixed(1),
    stage: +weekStageGain.toFixed(1),
  }), [weekVocGain, weekWriGain, weekStageGain]);

  // Instruction helpers
  function percentWithOffset(basePct, px, totalPx) {
    return Math.max(0, Math.min(100, basePct + (px / (totalPx || 1)) * 100));
  }

  function nextDieInfo(stat) {
    // Two upgrades: at 6 -> d12, at 9.9 -> d6
    const tiers = [ { t:6, f:12 }, { t:9.9, f:6 } ];
    for (let i=0;i<tiers.length;i++) {
      if (stat < tiers[i].t) return tiers[i];
    }
    return null;
  }

  function dieBadgePath(faces) {
    if (faces === 20) return '/art/d20badge.png';
    if (faces === 12) return '/art/d12badge.png';
    if (faces === 6) return '/art/d6badge.png';
    return null;
  }

  function dieProgress(stat){
    // Two-step progression: [0..6) is d20->d12, [6..9.9) is d12->d6
    const seq = [
      { floor:0, t:6, curr:20, next:12 },
      { floor:6, t:9.9, curr:12, next:6 },
    ];
    if (stat >= 9.9) return { curr:6, next:null, pct:1, floor:9.9, goal:10 };
    for (let i=0;i<seq.length;i++){
      const s = seq[i];
      if (stat < s.t){
        const pct = Math.max(0, Math.min(1, (stat - s.floor) / (s.t - s.floor)));
        return { curr:s.curr, next:s.next, pct, floor:s.floor, goal:s.t };
      }
    }
    return { curr:20, next:12, pct:0, floor:0, goal:6 };
  }

  function actionButtonSrc(type) {
    // Resolve faces with one-shot override first
    let faces = nextRollOverride || (type === 'practice' ? facesFor(vocals) : type === 'write' ? facesFor(writing) : facesFor(stage));
    if (type === 'practice') {
      if (faces === 12) return '/art/singd12button.png';
      if (faces === 6) return '/art/singd6button.png';
      return '/art/singbutton2.png';
    }
    if (type === 'write') {
      if (faces === 12) return '/art/writed12button.png';
      if (faces === 6) return '/art/writed6button.png';
      return '/art/writebutton2.png';
    }
    // perform/dance
    if (faces === 12) return '/art/danced12button.png';
    if (faces === 6) return '/art/danced6button.png';
    return '/art/dancebutton2.png';
  }

  // Animate mirror modal entry/exit
  useEffect(() => {
    if (statsOpen) {
      // small delay to allow mount then animate
      const t = setTimeout(() => setMirrorAnim(true), 10);
      return () => clearTimeout(t);
    } else {
      setMirrorAnim(false);
    }
  }, [statsOpen]);

  // Animate shop modal entry/exit
  useEffect(() => {
    if (shopOpen) {
      const t = setTimeout(() => setShopAnim(true), 10);
      return () => clearTimeout(t);
    } else {
      setShopAnim(false);
    }
  }, [shopOpen]);

  function pushToast(text) {
    const id = Date.now() + Math.random();
    setToasts((arr)=>[...arr, {id, text}]);
    setTimeout(()=>{
      setToasts((arr)=>arr.filter(t=>t.id!==id));
    }, 2600);
  }

  function bubbleBg(val, faces) {
    if (!val || !faces) return 'rgba(0,0,0,.8)';
    const frac = (faces + 1 - val) / faces; // low is better
    if (frac >= 0.66) return 'rgba(80,180,120,.85)';
    if (frac >= 0.33) return 'rgba(200,160,80,.85)';
    return 'rgba(200,90,90,.85)';
  }

  // Build a thicker, more solid outline using stacked drop-shadows around the image silhouette
  function solidOutlineFilter(color) {
    const s = 0; // thickness in px (no hard edge)
    return [
      `drop-shadow(0 0 0 ${color})`,
      `drop-shadow(${s}px 0 0 ${color})`,
      `drop-shadow(${-s}px 0 0 ${color})`,
      `drop-shadow(0 ${s}px 0 ${color})`,
      `drop-shadow(0 ${-s}px 0 ${color})`,
      `drop-shadow(${s}px ${s}px 0 ${color})`,
      `drop-shadow(${-s}px ${s}px 0 ${color})`,
      `drop-shadow(${s}px ${-s}px 0 ${color})`,
      `drop-shadow(${-s}px ${-s}px 0 ${color})`,
      `drop-shadow(0 0 10px ${color})`,
    ].join(' ');
  }

  // Detect dice upgrades when stats change
  useEffect(()=>{
    if (!DICE_MODE) return;
    const curr = {
      sing: facesFor(vocals),
      write: facesFor(writing),
      perform: facesFor(stage)
    };
    const changes = [];
    if (curr.sing < prevFaces.sing) changes.push({label:'Sing', from: prevFaces.sing, to: curr.sing});
    if (curr.write < prevFaces.write) changes.push({label:'Write', from: prevFaces.write, to: curr.write});
    if (curr.perform < prevFaces.perform) changes.push({label:'Perform', from: prevFaces.perform, to: curr.perform});
    if (changes.length) {
      changes.forEach(c=> pushToast(`${c.label} die upgraded: d${c.from} -> d${c.to}`));
      pushToast('Train with actions and gigs to improve dice');
      setPrevFaces(curr);
    }
  }, [vocals, writing, stage]);

  // Animated roll FX: flicker numbers above the performer
  useEffect(()=>{
    if (!rollFx.show) return;
    const hold = Math.max(700, rollFxHoldMs || 2500);
    const isGif = (rollFx.faces === 20 || rollFx.faces === 12 || rollFx.faces === 6);
    // For d12/d6: settle ~1.3s before hide (1.0s pulse + 0.3s fade)
    const settleMs = isGif ? Math.max(300, hold - 1300) : Math.max(300, hold - 300);
    const hideMs = hold + 300;
    // Start rolling sound and loop while the dice FX is visible
    try {
      if (rollAudioRef.current) { try { rollAudioRef.current.pause(); } catch (_) {} }
      const ra = new Audio('/sounds/dierollingsound.mp3');
      ra.loop = true;
      rollAudioRef.current = ra;
      ra.play().catch(() => {});
      // If writing roll, layer in typing sound
      if (rollFx.action === 'write') {
        if (typingAudioRef.current) { try { typingAudioRef.current.pause(); } catch (_) {} }
        const ta = new Audio('/sounds/typingsound.mp3');
        ta.loop = true;
        typingAudioRef.current = ta;
        ta.play().catch(() => {});
      }
      // If perform/dance roll, try top-trend 5s preview; fallback to dance SFX
      if (rollFx.action === 'perform') {
        const ok = playDancePreviewFromTopTrend();
        if (!ok) {
          if (danceAudioRef.current) { try { danceAudioRef.current.pause(); } catch (_) {} }
          const da = new Audio('/sounds/dancingsound.mp3');
          da.loop = true;
          danceAudioRef.current = da;
          da.play().catch(() => {});
        }
      }
    } catch (_) {}
    setRollFxFadeOut(false);
    setRollFxPulse(false);
    let tick = setInterval(()=>{
      setRollFx(prev=> ({ ...prev, current: 1 + Math.floor(Math.random() * (prev.faces||20)) }));
    }, 40);
    let fadeTimer;
    let settle = setTimeout(()=>{
      clearInterval(tick);
      setRollFx(prev=> ({ ...prev, current: prev.final, settled: true }));
      if (isGif) {
        // Start 1s pulse, then mark fade
        setRollFxPulse(true);
        setTimeout(()=> setRollFxPulse(false), 1000);
        fadeTimer = setTimeout(()=> setRollFxFadeOut(true), 1000);
      }
    }, settleMs);
    let hide = setTimeout(()=>{
      setRollFx({ show:false, faces:0, current:null, final:null, settled:false, action:null });
    }, hideMs);
    return ()=> {
      clearInterval(tick); clearTimeout(settle); clearTimeout(hide); if (fadeTimer) clearTimeout(fadeTimer);
      try { if (rollAudioRef.current) { rollAudioRef.current.pause(); rollAudioRef.current = null; } } catch (_) {}
      try { if (typingAudioRef.current) { typingAudioRef.current.pause(); typingAudioRef.current = null; } } catch (_) {}
      try { if (danceAudioRef.current) { danceAudioRef.current.pause(); danceAudioRef.current = null; } } catch (_) {}
      try { if (dancePreviewAudioRef.current) { dancePreviewAudioRef.current.pause(); dancePreviewAudioRef.current = null; } } catch (_) {}
      try {
        if (dancePreviewActiveRef.current) {
          setPlayingTrend(() => null);
        }
        dancePreviewPlayingKeyRef.current = null;
        dancePreviewActiveRef.current = false;
      } catch (_) {}
    };
  }, [rollFx.show, rollFxHoldMs]);

  // On settle, briefly show cues: button glow and dice glow; also persist per-button glow
  useEffect(() => {
    if (!rollFx.settled || !rollFx.action || !rollFx.final || !rollFx.faces) return;
    const faces = rollFx.faces; const value = rollFx.final;
    // For d12/d6: show result via toast instead of settling on a specific gif frame
    // For d12/d6 we now show number above head and fade; toast not needed
    const frac = (faces + 1 - value) / faces; // low is better
    let color = 'rgba(200,90,90,.95)'; // bad
    if (frac >= 0.66) { color = 'rgba(80,180,120,.95)'; }
    else if (frac >= 0.33) { color = 'rgba(200,160,80,.95)'; }
    // Persist glow color on the action button
    setRollGlow(prev => ({ ...prev, [rollFx.action]: color }));
    setRollRing({ show:true, action: rollFx.action, color });
    setBubbleGlow({ show:true, color });
    // Celebration text for top results: 3, 2, 1
    let ctext = '';
    let ccolor = 'rgba(80,180,120,.95)';
    if (value === 3) { ctext = 'Great'; ccolor = 'rgba(200,160,80,.95)'; }
    if (value === 2) { ctext = 'Amazing'; ccolor = 'rgba(120,200,140,.95)'; }
    if (value === 1) { ctext = 'Perfect'; ccolor = 'rgba(80,200,150,.95)'; }
    if (ctext) {
      const key = Date.now();
      setCelebrateFx({ show:true, text: ctext, color: ccolor, startX: pos.x, startY: pos.y, phase:'start', key });
      // Move to center shortly after render to trigger CSS transition
      setTimeout(() => {
        setCelebrateFx(prev => prev.key===key ? { ...prev, phase:'center' } : prev);
      }, 60);
      // Linger at center, then fade
      setTimeout(() => {
        setCelebrateFx(prev => prev.key===key ? { ...prev, phase:'fade' } : prev);
      }, 1400);
      // Remove after fade completes
      setTimeout(() => {
        setCelebrateFx(prev => prev.key===key ? { show:false, text:'', color:'#fff', startX:0, startY:0, phase:'start', key:0 } : prev);
      }, 2000);
    }
    const t = setTimeout(() => {
      setRollRing({ show:false, action:null, color:null });
      setBubbleGlow({ show:false, color:null });
    }, 650);
    return () => { clearTimeout(t); };
  }, [rollFx.settled]);

function stationTarget(type) {
    // Snap to anchored object centers; nearestWalkable() will adjust to the mask
    if (type === 'write') return { x: ANCHORS.chair.xPct, y: ANCHORS.chair.yPct };
    if (type === 'practice') return { x: Math.max(0, ANCHORS.mic.xPct - ((20/3168)*100)), y: ANCHORS.mic.yPct };
    // perform at mirror
    return { x: Math.max(0, ANCHORS.mirror.xPct - ((20/3168)*100)), y: ANCHORS.mirror.yPct };
  }

  function instruct(type) {
    if (!conceptLocked || remaining <= 0 || finishedReady) return;
    const base = 0.10; // slower leveling per action
    // nth action for this type this week (1-based)
    const nth = type === "practice" ? practiceT + 1 : type === "write" ? writeT + 1 : performT + 1;
    const delta = +(base * diminishFactor(nth)).toFixed(3);

    // Apply immediate training gains per action
    if (type === "practice") {
      setVocals((v) => clamp(v + delta, 0, 10));
      setWeekVocGain((g) => +(g + delta).toFixed(3));
      setPracticeT((v) => v + 1);
    } else if (type === "write") {
      setWriting((v) => clamp(v + delta, 0, 10));
      setWeekWriGain((g) => +(g + delta).toFixed(3));
      setWriteT((v) => v + 1);
    } else if (type === "perform") {
      setStage((v) => clamp(v + delta, 0, 10));
      setWeekStageGain((g) => +(g + delta).toFixed(3));
      setPerformT((v) => v + 1);
    }

    // Record per-day triad contribution to match visuals
    let m = 0, l = 0, p = 0;
    if (type === 'practice') m = 1 + vocals / 8;
    if (type === 'write') l = 1 + writing / 8;
    if (type === 'perform') p = 1 + stage / 8;
    setActions((arr) => [...arr, { t: type, d: delta, m, l, p }]);

    // Update status and move to station
    const msg =
      type === "practice"
        ? "Practicing vocal runs..."
        : type === "write"
        ? "Writing a catchy hook..."
        : "Rehearsing stage moves...";
    setStatus(msg);
    setPendingAct(type);
    const dest = stationTarget(type);
    setTarget(nearestWalkable(dest));
    setActivity("walk");
  }

  // (Confirmation removed) Directly reroll/consume day via instruct

  // End-of-week reset: keep training gains; just clear plan and counters
  function resetWeekProgress() {
    setWeekVocGain(0);
    setWeekWriGain(0);
    setWeekStageGain(0);
    setActions([]);
    setPracticeT(0);
    setWriteT(0);
    setPerformT(0);
    setRollBest({ sing: null, write: null, perform: null });
    setRollHistory([]);
    setBonusRolls(0);
    setRollGlow({ sing:null, write:null, perform:null });
    setWeekMode(null);
    // Clear any transient event modal
    setEventModal(null);
  }

  // --- Persistence (localStorage) ---
  const STORAGE_KEY = "performer-jam-save-v3";

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s || typeof s !== "object") return;
      if (typeof s.week === "number") setWeek(s.week);
      if (typeof s.money === "number") setMoney(s.money);
      if (typeof s.fans === "number") setFans(s.fans);
      if (typeof s.vocals === "number") setVocals(s.vocals);
      if (typeof s.writing === "number") setWriting(s.writing);
      if (typeof s.stage === "number") setStage(s.stage);
      if (GENRES.includes(s.genre)) setGenre(s.genre);
      if (THEMES.includes(s.theme)) setTheme(s.theme);
      if (typeof s.songName === "string") setSongName(s.songName);
      if (typeof s.conceptLocked === "boolean") setConceptLocked(s.conceptLocked);
      if (typeof s.started === "boolean") setStarted(s.started);
      if (Array.isArray(s.eventsSchedule)) setEventsSchedule(s.eventsSchedule);
      if (s.eventsResolved && typeof s.eventsResolved === 'object') setEventsResolved(s.eventsResolved);
      if (s && typeof s.seedTs === 'number') setSeedTs(s.seedTs);
      if (s && s.trendsByWeek && typeof s.trendsByWeek === 'object') setTrendsByWeek(s.trendsByWeek);
      if (typeof s.nudges === 'number') setNudges(s.nudges);
      if (Array.isArray(s.songHistory)) setSongHistory(s.songHistory);
      if (typeof s.finishedReady === "boolean") setFinishedReady(s.finishedReady);
      if (typeof s.earlyFinishEnabled === "boolean") setEarlyFinishEnabled(s.earlyFinishEnabled);
      if (typeof s.performerName === "string") setPerformerName(s.performerName);
      if (typeof s.performerName === "string") setPerformerName(s.performerName);
      if (typeof s.nextRollOverride === "number") setNextRollOverride(s.nextRollOverride);
      if (s.rollBest) setRollBest(s.rollBest);
      if (Array.isArray(s.rollHistory)) setRollHistory(s.rollHistory);
      if (s.friends && typeof s.friends === 'object') setFriends(s.friends);
      if (Array.isArray(s.pendingFriendEvents)) setPendingFriendEvents(s.pendingFriendEvents);
      if (typeof s.lastFriendProgressWeek === 'number') setLastFriendProgressWeek(s.lastFriendProgressWeek);
      if (s.friendMilestones && typeof s.friendMilestones === 'object') setFriendMilestones(s.friendMilestones);
      if (Array.isArray(s.actions)) {
        // Normalize to {t,d}
        const norm = s.actions.map((a) => {
          if (typeof a === "string") return { t: a, d: 0 };
          if (a && typeof a === "object" && (a.t === "practice" || a.t === "write" || a.t === "perform")) {
            return { t: a.t, d: typeof a.d === "number" ? a.d : 0 };
          }
          return null;
        }).filter(Boolean);
        setActions(norm);
        const p = norm.filter((a) => a.t === "practice").length;
        const w = norm.filter((a) => a.t === "write").length;
        const pf = norm.filter((a) => a.t === "perform").length;
        setPracticeT(p);
        setWriteT(w);
        setPerformT(pf);
        // Restore week gains if available, else derive rough sum from deltas
        if (typeof s.weekVocGain === "number") setWeekVocGain(s.weekVocGain);
        else setWeekVocGain(norm.filter(a=>a.t==="practice").reduce((sum,a)=>sum+a.d,0));
        if (typeof s.weekWriGain === "number") setWeekWriGain(s.weekWriGain);
        else setWeekWriGain(norm.filter(a=>a.t==="write").reduce((sum,a)=>sum+a.d,0));
        if (typeof s.weekStageGain === "number") setWeekStageGain(s.weekStageGain);
        else setWeekStageGain(norm.filter(a=>a.t==="perform").reduce((sum,a)=>sum+a.d,0));
      } else {
        if (typeof s.practiceT === "number") setPracticeT(s.practiceT);
        if (typeof s.writeT === "number") setWriteT(s.writeT);
        if (typeof s.performT === "number") setPerformT(s.performT);
      }
      if (typeof s.suppressFinale === 'boolean') setSuppressFinale(s.suppressFinale);
      if (s.lastResult && typeof s.lastResult === "object") setLastResult(s.lastResult);
      // Generate schedule if missing in save
      if (!Array.isArray(s.eventsSchedule)) {
        const baseTs = (s && s.ts) || Date.now();
        const sched = genEventSchedule((s && s.performerName) || performerName, baseTs);
        setEventsSchedule(sched);
      }
    } catch (_) {
      // ignore corrupted saves
    }
  }, []);

  // Fallback schedule generation if missing (e.g., fresh run without saved state)
  useEffect(() => {
    if (!eventsSchedule) {
      const baseTs = Date.now();
      const sched = genEventSchedule(performerName, baseTs);
      setEventsSchedule(sched);
    }
  }, [eventsSchedule, performerName]);

  // Seed for trends (stable per run)
  useEffect(() => {
    if (seedTs == null) setSeedTs(Date.now());
  }, [seedTs]);

  function ensureTrendsForWeek(wk) {
    if (seedTs == null) return;
    setTrendsByWeek(prev => {
      if (prev && prev[wk]) return prev;
      const base = genTrendsForWeek(wk, performerName, seedTs, audioTracks);
      return { ...(prev||{}), [wk]: base };
    });
  }

  // Load audio manifest from /audio/manifest.json (optional)
  useEffect(() => {
    let cancelled = false;
    async function loadManifest() {
      try {
        const res = await fetch('/audio/manifest.json', { cache: 'no-store' });
        if (!res.ok) return; // optional
        const data = await res.json();
        const tracks = Array.isArray(data?.tracks) ? data.tracks : [];
        const norm = tracks.map((t) => {
          // Accept {artist,title,sources:[...]}, or {file: 'Artist - Title.mp3'}
          let artist = t.artist, title = t.title, sources = [], cover = null;
          if (Array.isArray(t.sources)) {
            sources = t.sources.map((s) => (s.startsWith('/') ? s : `/audio/${s}`));
          } else if (t.file) {
            const f = String(t.file);
            sources = [f.startsWith('/') ? f : `/audio/${f}`];
            const m = f.match(/([^/\\]+)\.(mp3|ogg)$/i);
            const name = m ? m[1] : f;
            const mt = name.match(/^(.*?)\s*-\s*(.*)$/);
            if (!artist && mt) artist = mt[1];
            if (!title && mt) title = mt[2];
          }
          if (t.cover) cover = t.cover.startsWith('/') ? t.cover : `/audio/${t.cover}`;
          if (!artist || !title) return null;
          return { artist, title, sources, cover };
        }).filter(Boolean);
        if (!cancelled) setAudioTracks(norm);
      } catch (_) {
        // No manifest; keep empty to use fallback gen
      }
    }
    loadManifest();
    return () => { cancelled = true; };
  }, []);

  // When audio catalog loads, rebuild current week's trends if needed
  useEffect(() => {
    if (seedTs != null) {
      setTrendsByWeek({});
      ensureTrendsForWeek(week);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioTracks]);

  // Keep previews playing when My Music closes (no-op on close)
  useEffect(() => {
    // Intentionally do not pause audio on close
  }, [myMusicOpen]);


  // (Finale summary is opened explicitly when the Release Results modal Continue button is pressed.)
  // Additionally, if we reach the final week and no release flow handles it,
  // mark finale pending and surface the summary once overlays are clear.
  useEffect(() => {
    if (!suppressFinale && week === MAX_WEEKS && !finalePending && !finaleSummaryOpen && !finaleOpen && !finaleEndOpen) {
      setFinalePending(true);
    }
  }, [week, suppressFinale, finalePending, finaleSummaryOpen, finaleOpen, finaleEndOpen]);

  useEffect(() => {
    if (!finalePending) return;
    const overlaysOpen = isPerforming || releaseOpen || venueOpen || menuOpen || statsOpen || financeOpen || socialOpen || myMusicOpen || friendModal.open || calendarOpen || shopOpen || gigOpen || historyOpen || !!eventModal || !!eventInfoModal || friendModal.open;
    if (!overlaysOpen) {
      setFinalePending(false);
      setEndYearReady(true);
    }
  }, [finalePending, isPerforming, releaseOpen, venueOpen, menuOpen, statsOpen, financeOpen, socialOpen, myMusicOpen, calendarOpen, shopOpen, gigOpen, historyOpen, eventModal, eventInfoModal]);

  // When party performance ends, show final options modal
  useEffect(() => {
    if (finaleInProgress && !isPerforming) {
      setFinaleInProgress(false);
      setFinaleEndOpen(true);
    }
  }, [finaleInProgress, isPerforming]);

  // Show welcome on first week once
  useEffect(() => {
    if (started && week === 1 && !welcomeShown) {
      setShowWelcome(true);
      setWelcomeShown(true);
    }
  }, [started, week, welcomeShown]);

  // Dev helper: Alt+D to set week number quickly
  useEffect(() => {
    function onKeyDown(e) {
      try {
        if (e.altKey && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          const val = window.prompt(`Dev: Set week number (1-${MAX_WEEKS})`, String(week));
          if (val == null) return;
          const n = parseInt(val, 10);
          if (!isNaN(n)) {
            const clamped = Math.max(1, Math.min(MAX_WEEKS, n));
            setWeek(clamped);
            setStarted(true);
            setSuppressFinale(false);
            pushToast(`Dev: Week set to ${clamped}`);
          }
        }
      } catch (_) {}
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function playTrendItem(item) {
    if (!item) return;
    const id = `${item.artist}__${item.title}`;
    const isSame = playingTrend && playingTrend.id === id;
    let audio = audioRef.current;
    if (!audio) { audio = new Audio(); audioRef.current = audio; }
    if (isSame && !audio.paused) {
      try { audio.pause(); } catch (_) {}
      setPlayingTrend(null);
      return;
    }
    // Prefer explicit sources (from manifest); fallback to slug
    const sources = Array.isArray(item.audioSources) && item.audioSources.length
      ? item.audioSources
      : [ `/audio/${slugify(`${item.artist} ${item.title}`)}.mp3`, `/audio/${slugify(`${item.artist} ${item.title}`)}.ogg` ];
    let i = 0;
    const tryPlay = () => {
      if (i >= sources.length) { pushToast('Audio not available'); setPlayingTrend(null); return; }
      const src = sources[i++];
      audio.src = src;
      audio.onended = () => { setPlayingTrend(null); };
      audio.ontimeupdate = () => {
        try { setAudioTime({ current: audio.currentTime||0, duration: isFinite(audio.duration)? audio.duration : (audioTime.duration||0) }); } catch (_) {}
      };
      audio.onloadedmetadata = () => {
        try { setAudioTime({ current: audio.currentTime||0, duration: audio.duration||0 }); } catch (_) {}
      };
      audio.ondurationchange = () => {
        try { setAudioTime({ current: audio.currentTime||0, duration: audio.duration||0 }); } catch (_) {}
      };
      audio.play().then(() => {
        setPlayingTrend({ id, artist: item.artist, title: item.title });
      }).catch(() => {
        tryPlay();
      });
    };
    tryPlay();
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  // --- Room anchor overlay (anchors props to the background artboard)
  const APT = { w: 3168, h: 1344 }; // apartmentbackgroundwide.png
  const ANCHORS = {
    computer: { xPct: 68.85, yPct: 50.67, wPct: 12.03 },
    mic:      { xPct: 49.97, yPct: 54.82, wPct: 19.35 },
    chair:    { xPct: 62.50, yPct: 72.54, wPct: 10.61 },
    mirror:   { xPct: 85.23, yPct: 71.17, wPct: 20.31 },
    poster:   { xPct: 49.08, yPct: 38.02, wPct: 9.40 }, // undo x nudge; keep 2% smaller
  };
  function anchorStyle(a){
    return {
      position:'absolute',
      left: `${a.xPct}%`,
      top:  `${a.yPct}%`,
      transform: 'translate(-50%, -50%)',
      width: `${a.wPct}%`,
    };
  }

  // Load fan sprite image to compute tile sizes with padding
  useEffect(() => {
    try {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || 0; const h = img.naturalHeight || 0;
        const c = FAN_SPRITE.cols||10; const r = FAN_SPRITE.rows||10; const pad = FAN_SPRITE.pad||0;
        const tileW = c>0 ? Math.max(1, Math.floor((w - (c+1)*pad) / c)) : 0;
        const tileH = r>0 ? Math.max(1, Math.floor((h - (r+1)*pad) / r)) : 0;
        setFanSpriteMeta({ w, h, tileW, tileH });
      };
      img.src = FAN_SPRITE.path;
    } catch (_) {}
  }, []);

  useEffect(() => {
    const save = {
      week,
      money,
      fans,
      vocals,
      writing,
      stage,
      genre,
      theme,
      actions,
      practiceT,
      writeT,
      performT,
      songName,
      conceptLocked,
      started,
      finishedReady,
      rollBest,
      rollHistory,
      songHistory,
      weekVocGain,
      weekWriGain,
      weekStageGain,
      lastResult,
      earlyFinishEnabled,
      performerName,
      nextRollOverride,
      bonusRolls,
      nudges,
      eventsSchedule,
      eventsResolved,
      seedTs,
      trendsByWeek,
      suppressFinale,
      friends,
      pendingFriendEvents,
      lastFriendProgressWeek,
      friendMilestones,
      ts: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (_) {
      // quota/full - ignore for now
    }
  }, [week, money, fans, vocals, writing, stage, genre, theme, songName, conceptLocked, started, finishedReady, songHistory, actions, practiceT, writeT, performT, rollBest, rollHistory, weekVocGain, weekWriGain, weekStageGain, lastResult, earlyFinishEnabled, performerName, nextRollOverride, bonusRolls, nudges, eventsSchedule, eventsResolved, seedTs, trendsByWeek]);

  // No auto pop-ups on start; concept modal is opened via "Create a song" in stats
  useEffect(() => {}, [started, conceptLocked, week, lastResult, showWelcome, showConcept]);

  function saveNow() {
    try {
      const save = {
        week,
        money,
        fans,
        vocals,
        writing,
        stage,
        genre,
        theme,
        practiceT,
        writeT,
        performT,
        lastResult,
        earlyFinishEnabled,
        performerName,
        nextRollOverride,
        bonusRolls,
        nudges,
        eventsSchedule,
        eventsResolved,
        seedTs,
        trendsByWeek,
        suppressFinale,
        friends,
        pendingFriendEvents,
        ts: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (_) {}
  }

  function clearSave() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function setPreset(p) {
    if (p === "writer") {
      setPracticeT(2); setWriteT(6); setPerformT(2);
    } else if (p === "balanced") {
      setPracticeT(3); setWriteT(4); setPerformT(3);
    } else if (p === "performer") {
      setPracticeT(2); setWriteT(2); setPerformT(6);
    }
  }

  function performRelease(venueKey) {
    const venue = VENUES[venueKey] ?? VENUES.busking;
    if (!canRelease) return;

    // Core scoring (simple + readable)
    // Production Triad model: Melody, Lyrics, Performance built from days, scaled by stats
    let triadBase = 0;
    if (DICE_MODE) {
      // Low is better: score uses inverted normalized values
      const s = rollBest.sing ? ((rollBest.sing.faces + 1 - rollBest.sing.value) / rollBest.sing.faces) : 0;
      const w = rollBest.write ? ((rollBest.write.faces + 1 - rollBest.write.value) / rollBest.write.faces) : 0;
      const p = rollBest.perform ? ((rollBest.perform.faces + 1 - rollBest.perform.value) / rollBest.perform.faces) : 0;
      // Weight roughly equal; Option 1: lower base scaling for tighter early game
      triadBase = (0.34 * s + 0.33 * w + 0.33 * p) * 92;
    } else {
      // Sum triad contributions from recorded actions (exclude gigs)
      const triadSum = actions.reduce((acc, a) => a.t === 'gig' ? acc : acc + (a.m||0) + (a.l||0) + (a.p||0), 0);
      triadBase = triadSum * 5; // retuned lower early power
      // Early-week dampener (weeks 1?6): gradually scales up to full power
      const earlyFactor = Math.min(1, 0.75 + (week - 1) * 0.05);
      triadBase *= earlyFactor;
    }

    let variance = randInt(-5, 5) + randInt(-venue.rng, venue.rng);
    if (compat < 0) variance += randInt(-1, 1); // slightly swingier feel for risky
    let pairBonus = 0;
    if (DICE_MODE) {
      const s = rollBest.sing ? ((rollBest.sing.faces + 1 - rollBest.sing.value) / rollBest.sing.faces) : 0;
      const w = rollBest.write ? ((rollBest.write.faces + 1 - rollBest.write.value) / rollBest.write.faces) : 0;
      const p = rollBest.perform ? ((rollBest.perform.faces + 1 - rollBest.perform.value) / rollBest.perform.faces) : 0;
      pairBonus = computePairSwingBonus(compat, s, w, p);
    } else {
      pairBonus = computePairBonus(genre, theme, true);
    }
    const score = clamp(triadBase + pairBonus + variance, 0, 100);
    let grade = gradeFromScore(score);
    const isMasterpiece = !!(DICE_MODE && rollBest?.sing?.value === 1 && rollBest?.write?.value === 1 && rollBest?.perform?.value === 1);
    if (isMasterpiece) grade = 'Masterpiece';

    // Fans: base by grade, scaled by venue
    const fansGainByGrade = { Masterpiece: 80, S: 60, A: 40, B: 25, C: 12, D: 5 };

    // Small scaling with existing fans so growth feels good
    const fanBonus = Math.floor(fans * 0.05); // +5% of current fans
    let fansGain = Math.round((fansGainByGrade[grade] + fanBonus) * (venue.fanMult ?? 1));

    // Money: venue economics (apply payout multiplier from events)
    const margin = score - (venue.breakEven ?? 0);
    let gross = Math.max(0, margin) * (venue.payoutPerPoint ?? 0) * (activeEffects?.payoutMult || 1);
    let net = Math.floor(gross - (venue.cost ?? 0));
    // Busking never loses money; small tip floor
    if (venueKey === 'busking') net = Math.max(venue.tipFloor ?? 5, net);
    // Early guardrail: weeks 1?3, cap losses
    if (week <= 3) net = Math.max(net, -20);

    const moneyGain = net;

    // Optional twist: busking grants small stage boost
    if (venueKey === 'busking') {
      setStage((v) => clamp(v + 0.2, 0, 10));
    }

    setMoney((m) => m + moneyGain);
    // Apply fan multiplier from events
    const fansGainApplied = Math.round(fansGain * (activeEffects?.fanMult || 1));
    setFans((f) => f + fansGainApplied);

    const chartPos = computeChartPosition(score, fans);
    const feedback = buildFeedback({
      vocals,
      writing,
      stage,
      practiceT,
      writeT,
      performT,
      compat,
      genre,
      theme,
      songHistory,
      score,
    });
    const entry = {
      week,
      releaseWeek: week,
      songName,
      genre,
      theme,
      compat,
      venue: venue.name,
      score,
      grade,
      chartPos,
      review: pickReview(grade),
      moneyGain,
      fansGain: fansGainApplied,
      feedback,
      fanComments: [],
    };
    entry.fanComments = generateFanComments(entry, performerName);
    setLastResult(entry);
    setSongHistory((arr) => [entry, ...arr]);

    // Update Global Trends for this release week and next week (inject player A/S songs)
    if (grade === 'A' || grade === 'S' || grade === 'Masterpiece') {
      const wk = entry.releaseWeek;
      const genreKey = (() => {
        switch (genre) {
          case 'Rock': return 'rock';
          case 'EDM': return 'edm';
          case 'Hip-Hop': return 'hiphop';
          case 'Jazz': return 'jazz';
          case 'Country': return 'country';
          case 'R&B': return 'randb';
          case 'Metal': return 'metal';
          case 'Folk': return 'folk';
          case 'Synthwave': return 'synthwave';
          case 'Pop': default: return null;
        }
      })();
      const playerAudioSources = genreKey ? [ `/sounds/fullsinging_${genreKey}.ogg` ] : [ '/sounds/fullsinging.ogg' ];
      const injectForWeek = (wkKey) => {
        setTrendsByWeek((prev) => {
          const base = (prev && prev[wkKey]) ? prev[wkKey].slice() : genTrendsForWeek(wkKey, performerName, seedTs || Date.now(), audioTracks);
          const boost = Math.min(6, Math.floor(Math.log10((fans||0)+10) * 2));
          const gradeBoost = grade === 'S' || grade === 'Masterpiece' ? 3 : 1;
          const playerScore = score + boost + gradeBoost;
          const existing = base.filter(it => !it.isPlayer);
          existing.push({ rank:0, artist: performerName || 'You', title: songName || 'Your Song', score: playerScore, isPlayer:true, audioSources: playerAudioSources });
          existing.sort((a,b)=>b.score-a.score);
          existing.slice(0,5).forEach((it,idx)=> it.rank = idx+1);
          return { ...(prev||{}), [wkKey]: existing.slice(0,5) };
        });
      };
      injectForWeek(wk);
      injectForWeek(wk + 1);
    }

    const wasFinalWeek = (week === MAX_WEEKS);
    // Snapshot the song details for the venue performance HUD before clearing for next week
    setPerformingSong({ name: songName, genre, theme });
    setWeek((w) => w + 1);
    resetWeekProgress();
    setConceptLocked(false);
    setSongName("");
    setStatus("Song released! Checking reviews...");
    setVenueOpen(false);
    setPerformingVenue(venueKey);
    setIsPerforming(true);
    // Center performer on stage and play full song
    setTarget(null);
    setPos({ x: 50, y: 62 });
    if (wasFinalWeek && !suppressFinale) {
      setFinalePending(true);
      setReleaseWasShown(false); // ensure we wait for THIS week's release modal
    }
    setActivity('singing');
    setStatus(`Performing at ${venue.name}...`);
    setFinishedReady(false);
    try {
      if (performAudioRef.current) {
        try { performAudioRef.current.pause(); } catch (_) {}
      }
      const genreKey = (() => {
        switch (genre) {
          case 'Rock': return 'rock';
          case 'EDM': return 'edm';
          case 'Hip-Hop': return 'hiphop';
          case 'Jazz': return 'jazz';
          case 'Country': return 'country';
          case 'R&B': return 'randb';
          case 'Metal': return 'metal';
          case 'Folk': return 'folk';
          case 'Synthwave': return 'synthwave';
          case 'Pop': default: return null; // Pop uses default
        }
      })();
      const primarySrc = genreKey ? `/sounds/fullsinging_${genreKey}.ogg` : '/sounds/fullsinging.ogg';
      const fallbackSrc = '/sounds/fullsinging.ogg';
      const audio = new Audio(primarySrc);
      let didFallback = false;
      audio.onended = () => {
        setIsPerforming(false);
        setReleaseOpen(true);
        setActivity('idle');
        performAudioRef.current = null;
        setPerformingSong(null);
      };
      audio.onerror = () => {
        if (!didFallback) {
          didFallback = true;
          try { audio.src = fallbackSrc; audio.play().catch(() => {}); } catch (_) {}
        }
      };
      performAudioRef.current = audio;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function skipPerformance() {
    try {
      if (performAudioRef.current) {
        try { performAudioRef.current.pause(); } catch (_) {}
        performAudioRef.current = null;
      }
    } catch (_) {}
    setIsPerforming(false);
    setReleaseOpen(true);
    setActivity('idle');
    setPerformingSong(null);
  }

  function finishSong() {
    if (!canRelease) return;
    setFinishedReady(true);
    setStatus("Song finished. Choose a venue to perform.");
  }

  function restart() {
    setWeek(1);
    setMoney(0);
    setFans(0);
    setVocals(2);
    setWriting(2);
    setStage(2);
    setGenre(GENRES[0]);
    setTheme(THEMES[0]);
    resetWeekProgress();
    setLastResult(null);
    setStatus("Fresh start! Ready to work!");
    setConceptLocked(false);
    setSongName("");
  }

  // Movement loop: walk towards target; idle roam when no target
  useEffect(() => {
    const speed = 1.2; // percent per tick
    const tickMs = 60;
    const id = setInterval(() => {
      setPos((p) => {
        if (!target) return p;
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        // Update facing based on movement direction (only matters for walking)
        if (dist > 0.1) {
          setFacingLeft(dx < 0);
        }
        if (dist < 0.8) {
          // Arrived
          setTarget(null);
          if (pendingAct) {
            const act = pendingAct;
            setPendingAct(null);
            let writeHold = null; // for syncing write duration to dice FX
            if (act === "write") {
              setActivity("write");
              setStatus("Writing a catchy hook...");
              if (DICE_MODE) {
                const faces = nextRollOverride || facesFor(writing);
                const value = rollDie(faces);
                setRollBest((r) => ({ ...r, write: { value, faces, nudged:false } }));
                setRollHistory((h) => [...h, { day: TOTAL_TIME - remaining + 1, action: 'write', value, faces }]);
                setRollFx({ show:true, faces, current:null, final:value, settled:false, action:'write' });
                const hold = (faces === 20 || faces === 12 || faces === 6) ? 5000 : 1200;
                setRollFxHoldMs(hold);
                writeHold = hold;
                if (nextRollOverride) setNextRollOverride(null);
              }
            } else if (act === "practice") {
              setActivity("singing");
              setStatus("Practicing vocal runs...");
              playSingSfx();
              if (DICE_MODE) {
                const faces = nextRollOverride || facesFor(vocals);
                const value = rollDie(faces);
                setRollBest((r) => ({ ...r, sing: { value, faces, nudged:false } }));
                setRollHistory((h) => [...h, { day: TOTAL_TIME - remaining + 1, action: 'sing', value, faces }]);
                setRollFx({ show:true, faces, current:null, final:value, settled:false, action:'sing' });
                setRollFxHoldMs(5000);
                if (nextRollOverride) setNextRollOverride(null);
              }
            } else if (act === "perform") {
              setActivity("dancing");
              setStatus("Rehearsing stage moves...");
              if (DICE_MODE) {
                const faces = nextRollOverride || facesFor(stage);
                const value = rollDie(faces);
                setRollBest((r) => ({ ...r, perform: { value, faces, nudged:false } }));
                setRollHistory((h) => [...h, { day: TOTAL_TIME - remaining + 1, action: 'perform', value, faces }]);
                setRollFx({ show:true, faces, current:null, final:value, settled:false, action:'perform' });
                setRollFxHoldMs(5000);
                if (nextRollOverride) setNextRollOverride(null);
              }
            }
            // For write, keep activity until dice FX fully hides (hold + 300ms)
            const dur = act === 'practice' ? 5000 : act === 'perform' ? 5000 : ((writeHold != null ? writeHold + 300 : 1200));
            setTimeout(() => setActivity("idle"), dur);
          } else {
            setActivity("idle");
          }
          return { x: target.x, y: target.y };
        }
        const step = Math.min(speed, dist);
        return { x: p.x + (dx / dist) * step, y: p.y + (dy / dist) * step };
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [target, pendingAct]);

  function randomWalkable() {
    if (walkablePts && walkablePts.length > 0) {
      const pt = walkablePts[Math.floor(Math.random() * walkablePts.length)];
      const yAdj = pt.y + (FLOOR_TARGET_Y_ADJUST_PX / ROOM_HEIGHT) * 100;
      return { x: pt.x, y: Math.max(0, Math.min(100, yAdj)) };
    }
    const rx = 10 + Math.random() * 80;
    const ry = 55 + Math.random() * 20;
    const yAdj = ry + (FLOOR_TARGET_Y_ADJUST_PX / ROOM_HEIGHT) * 100;
    return { x: rx, y: Math.max(0, Math.min(100, yAdj)) };
  }
  function nearestWalkable(pt) {
    if (!walkablePts || walkablePts.length === 0) return pt;
    let best = null; let bd = Infinity;
    for (let i = 0; i < walkablePts.length; i++) {
      const p = walkablePts[i];
      const dx = p.x - pt.x; const dy = p.y - pt.y;
      const d = dx*dx + dy*dy;
      if (d < bd) { bd = d; best = p; }
    }
    const res = best || pt;
    const yAdj = res.y + (FLOOR_TARGET_Y_ADJUST_PX / ROOM_HEIGHT) * 100;
    return { x: res.x, y: Math.max(0, Math.min(100, yAdj)) };
  }

  // Idle roaming: pick random spots when idle and no target
  useEffect(() => {
    if (target || activity !== "idle") return;
    const timeout = setTimeout(() => {
      const pt = randomWalkable();
      setTarget(pt);
      setActivity("walk");
    }, 1200 + Math.random() * 2000);
    return () => clearTimeout(timeout);
  }, [target, activity]);

  // Compute room width to fit background image scaled by fixed height
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        const ratio = img.naturalWidth / img.naturalHeight;
        const w = Math.round(ROOM_HEIGHT * ratio);
        setRoomWidth(Math.max(300, Math.min(800, w)));
      }
    };
    img.src = '/art/apartmentbackground.png';
  }, []);

  // Load floor mask to constrain idle roaming and station targets
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      try {
        const cw = img.naturalWidth;
        const ch = img.naturalHeight;
        const canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, cw, ch).data;
        const pts = [];
        // Denser sampling for more accurate nearest-walkable snapping on mobile
        const stride = 6; // pixels
        for (let y = 0; y < ch; y += stride) {
          for (let x = 0; x < cw; x += stride) {
            const i = (y * cw + x) * 4;
            const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
            const lum = (r + g + b) / 3;
            if (a > 200 && lum > 200) {
              pts.push({ x: (x / cw) * 100, y: (y / ch) * 100 });
            }
          }
        }
        setWalkablePts(pts);
      } catch (e) {
        setWalkablePts([]);
      }
    };
    img.src = '/art/apartmentfloor-mask-wide.png';
  }, []);

  const isOver = week > MAX_WEEKS;

  const bestChart = useMemo(() => {
    if (!songHistory || songHistory.length === 0) return null;
    return Math.min(...songHistory.map((s) => (s.chartPos ?? 100)));
  }, [songHistory]);

  const bestGrade = useMemo(() => {
    if (!songHistory || songHistory.length === 0) return null;
    const order = { Masterpiece: 6, S: 5, A: 4, B: 3, C: 2, D: 1 };
    return songHistory.reduce((best, s) => (order[s.grade] > (order[best] ?? 0) ? s.grade : best), 'D');
  }, [songHistory]);

  const weeklyGigs = useMemo(() => (actions || []).filter((a) => a.t === 'gig').length, [actions]);

  // Active events and effects for the current week
  const activeEvents = useMemo(() => {
    if (!eventsSchedule) return [];
    return eventsSchedule.filter(e => e.week === week);
  }, [eventsSchedule, week]);

  const activeEffects = useMemo(() => mergeEffects(activeEvents.map(ev => {
    // If event has choices, apply chosen effect only
    const res = eventsResolved[ev.id];
    if (ev.choices && res && typeof res.choiceIndex === 'number') {
      return { effect: ev.choices[res.choiceIndex]?.effect || {} };
    }
    if (ev.choices) return { effect: {} }; // no choice made yet
    return ev;
  })), [activeEvents, eventsResolved]);

  // On week start: if event grants money immediately or requires choice, handle modal/auto-grant once
  useEffect(() => {
    if (!eventsSchedule) return;
    // Auto-grant one-time money if not resolved
    activeEvents.forEach(ev => {
      const res = eventsResolved[ev.id];
      if ((!res || res.status !== 'resolved') && ev.effect && typeof ev.effect.grantMoney === 'number') {
        setMoney(m => m + (ev.effect.grantMoney||0));
        setEventsResolved(r => ({ ...r, [ev.id]: { status:'resolved' } }));
      }
    });
    // If any event has choices pending, show the first pending
    const pendingChoice = activeEvents.find(ev => ev.choices && !(eventsResolved[ev.id] && typeof eventsResolved[ev.id].choiceIndex === 'number'));
    if (pendingChoice) {
      setEventModal({ event: pendingChoice });
    } else {
      // Weekly "This Week" modal: always show once per week after overlays clear (skip week 1, show welcome instead)
      const toNotify = activeEvents.filter(ev => !ev.choices && !(eventsResolved[ev.id] && eventsResolved[ev.id].notified));
      const upcomingNext = (eventsSchedule||[]).find(e => e.week === week + 1) || null;
      const overlaysOpen = isPerforming || releaseOpen || venueOpen || menuOpen || statsOpen || financeOpen || socialOpen || myMusicOpen || friendModal.open || calendarOpen || shopOpen || gigOpen || historyOpen || !!eventModal || !!eventInfoModal || showWelcome || friendModal.open || showConcept;
      if (weeklyInfoShownWeek !== week && week > 1) {
        if (!overlaysOpen) {
          setEventInfoModal({ events: toNotify, upcoming: upcomingNext, weekly: true });
          setWeeklyInfoShownWeek(week);
        } else {
          setQueuedEventInfo({ events: toNotify, upcoming: upcomingNext, weekly: true, week });
        }
      }
    }
  }, [week, eventsSchedule]);

  // When overlays clear, show any queued event info modal (including weekly)
  useEffect(() => {
    if (!queuedEventInfo) return;
    const overlaysOpen = isPerforming || releaseOpen || venueOpen || menuOpen || statsOpen || financeOpen || socialOpen || myMusicOpen || friendModal.open || calendarOpen || shopOpen || gigOpen || historyOpen || !!eventModal || !!eventInfoModal || showWelcome || friendModal.open || showConcept;
    if (overlaysOpen) return;
    // Filter out any that were marked notified while queued
    const remaining = (queuedEventInfo.events||[]).filter(ev => !(eventsResolved[ev.id] && eventsResolved[ev.id].notified));
    if ((remaining && remaining.length) || queuedEventInfo.weekly) {
      setEventInfoModal({ events: remaining||[], upcoming: queuedEventInfo.upcoming||null, weekly: queuedEventInfo.weekly||false });
      if (typeof queuedEventInfo.week === 'number') setWeeklyInfoShownWeek(queuedEventInfo.week);
    }
    setQueuedEventInfo(null);
  }, [queuedEventInfo, isPerforming, releaseOpen, venueOpen, menuOpen, statsOpen, financeOpen, socialOpen, myMusicOpen, calendarOpen, shopOpen, gigOpen, historyOpen, eventModal, eventInfoModal, eventsResolved]);

  // Ensure fan comments exist for this week's release once MyBubble opens
  useEffect(() => {
    if (!socialOpen) return;
    const targetWeek = Math.max(1, week - 1);
    const entry = (songHistory||[]).find(s=> s.releaseWeek === targetWeek) || (songHistory||[])[0];
    if (!entry) return;
    if (!entry.fanComments || !entry.fanComments.length) {
      const comments = generateFanComments(entry, performerName);
      setSongHistory((arr) => {
        const copy = arr.slice();
        const idx = copy.findIndex((s) => s.releaseWeek === (entry.releaseWeek||entry.week) && s.songName === entry.songName);
        if (idx >= 0) {
          const e = { ...copy[idx], fanComments: comments };
          copy[idx] = e;
        }
        return copy;
      });
    }
  }, [socialOpen, week, performerName, songHistory]);

  // Title screen before starting
  if (!started) {
    return (
      <div style={styles.page}>
        <div style={styles.titleScreen}>
          <button
            onClick={() => setStarted(true)}
            style={styles.startImgButton}
            title="Start new game"
          >
            <img src="/art/newgamebutton.png" alt="Start New Game" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </button>
          <button
            onClick={() => {
              try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) { pushToast('No save found'); return; }
                const s = JSON.parse(raw);
                if (!s || typeof s !== 'object') { pushToast('No save found'); return; }
                setStarted(true);
              } catch (_) { pushToast('Unable to continue'); }
            }}
            style={styles.continueImgButton}
            title="Continue game"
          >
            <img src="/art/continuegamebutton.png" alt="Continue Game" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {!!toasts.length && (
        <div style={styles.toastWrap}>
          {toasts.map(t=> (
            <div key={t.id} style={styles.toast}>{t.text}</div>
          ))}
        </div>
      )}
      <div style={styles.card}>
        {/* Header removed for mobile-first apartment view */}

        {/* Streamlined: hide resource pills for a cleaner main view */}

        <div style={styles.grid}>
          

          <section style={{...styles.section, display: 'none'}}>
            <h3 style={styles.h3}>Song Concept</h3>
            {!conceptLocked ? (
              <>
                <div style={styles.label}>Genre</div>
                <div style={styles.rowWrap}>
                  {GENRES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenre(g)}
                      style={g === genre ? styles.btnOn : styles.btnOff}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <div style={styles.label}>Theme</div>
                <div style={styles.rowWrap}>
                  {THEMES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      style={t === theme ? styles.btnOn : styles.btnOff}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ ...styles.label, marginTop: 8 }}>Song name</div>
                <div style={styles.inlineRow}>
                  <input
                    value={songName}
                    onChange={(e) => setSongName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                    placeholder="Type a song name..."
                    style={styles.input}
                    enterKeyHint="done"
                  />
                  <button
                    style={styles.smallBtn}
                    onClick={() => {
                      try { if (document.activeElement) document.activeElement.blur(); } catch(_) {}
                    }}
                  >OK</button>
                </div>

                {/* Compatibility indicator removed */}

                <button
                  onClick={() => { setConceptLocked(true); setWeekMode('song'); const c = compat; setPairFeedback(c>0 ? 'great combination' : c<0 ? 'risky combination' : 'okay combination'); }}
                  disabled={!songName.trim()}
                  style={!songName.trim() ? styles.primaryBtnDisabled : styles.primaryBtn}
                >
                  Begin week
                </button>
              </>
            ) : (
              <>
                <div style={{ ...styles.sub, marginBottom: 6 }}>
                  Working on: <b>{songName}</b> ({genre} / {theme})
                </div>
                <div style={styles.lockNote}>Concept locked for this week</div>
              </>
            )}
          </section>

          <section style={styles.section}>
            {/* Streamlined main view: room dominates, buttons underneath */}
            <div style={styles.roomOuter}>
              <div style={{ ...styles.room, backgroundImage: isPerforming && performingVenue ? `url('${VENUE_BG[performingVenue]}')` : "url('/art/apartmentbackgroundwide.png')" }}>
              {/* Anchor overlay (apartment objects) - hidden during venue performances */}
              {!(isPerforming && performingVenue) && (
              <div style={styles.roomAnchors}>
                {/* Computer (click opens Settings/desktop) */}
                <div style={anchorStyle(ANCHORS.computer)} onClick={() => setFinanceOpen(true)}>
                  <img src="/art/computer.png" alt="Computer" style={{ width:'100%', height:'auto', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.25))' }} />
                </div>
                {currentPosterIdx != null && (
                  <div style={anchorStyle(ANCHORS.poster)} onClick={() => setPosterOpen(true)} title="My Poster Collection">
                    <img src={POSTERS[currentPosterIdx]} alt="Poster" style={{ width:'100%', height:'auto', borderRadius: 6 }} />
                  </div>
                )}
                {currentPosterIdx == null && (
                  <div
                    style={{ ...anchorStyle(ANCHORS.poster), aspectRatio: '3 / 4', background: 'transparent', cursor: 'pointer' }}
                    onClick={() => setPosterOpen(true)}
                    title="My Poster Collection"
                  />
                )}
                {/* Microphone -> opens Create/Current Song modal */}
                <div
                  style={anchorStyle(ANCHORS.mic)}
                  onClick={() => {
                    if (endYearReady || isOver) { pushToast('Year complete - press End year'); return; }
                    if (!conceptLocked) setShowConcept(true); else setProgressOpen(true);
                  }}
                  title={conceptLocked ? 'Current Song' : 'Create Song'}
                >
                  <img src="/art/microphone.png" alt="Microphone" style={{ width:'100%', height:'auto', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.25))' }} />
                </div>
                {/* Chair (visual only) */}
                <div style={anchorStyle(ANCHORS.chair)}>
                  <img src="/art/chair.png" alt="Chair" style={{ width:'100%', height:'auto', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.25))' }} />
                </div>
                {/* Mirror (click opens stats) */}
                <div style={anchorStyle(ANCHORS.mirror)} onClick={() => setStatsOpen(true)}>
                  <img src="/art/mirror.png" alt="Mirror" style={{ width:'100%', height:'auto', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.25))' }} />
                </div>
                
              </div>
              )}
              {/* Room HUD: show money and rolls */}
              {!isPerforming && (
                <div style={styles.hudMoney}>{'\u00A3'} {money}</div>
              )}
              {!playingTrend && !isPerforming && (
                <div style={styles.hudRolls}>Available rolls: {Math.max(0, remaining)}</div>
              )}
              {playingTrend && (
                <div style={styles.hudListening} title={`${playingTrend.artist} - ${playingTrend.title}`}>
                  <span style={{ marginRight: 6, opacity: .9 }}></span>
                  <b style={{ fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth: 220 }}>{playingTrend.artist} - {playingTrend.title}</b>
                </div>
              )}
              {isPerforming && (
                <div style={styles.hudPerforming} title={`${(performingSong?.name || songName || 'Your Song')} - ${(performingSong?.genre || genre)} / ${(performingSong?.theme || theme)}`}>
                  <div style={{ fontWeight: 800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth: 240 }}>{performingSong?.name || songName || 'Your Song'}</div>
                  <div style={{ fontSize: 12, opacity: .9 }}>{performingSong?.genre || genre} / {performingSong?.theme || theme}</div>
                </div>
              )}
              {nudges > 0 && (
                <img
                  src="/art/nudgebutton.png"
                  alt="Nudge"
                  title={`Nudges: ${nudges}`}
                  onClick={() => setNudgeOpen(true)}
                  style={styles.nudgeImgBtn}
                />
              )}
              {DICE_MODE && SHOW_DICE_MINI && (
                <div style={styles.diceMiniOverlay}>
                  {(() => { const rb=rollBest.sing; const faces = rb? rb.faces : facesFor(vocals); const val = rb? rb.value : null; const bg = bubbleBg(val||0, faces); return (
                    <div style={{...styles.diceMiniChip, background:bg}} title="Sing">
                      <div style={styles.diceLabel}>S</div>
                      <div style={styles.diceVal}>{val? `${val}/${faces}` : `d${faces}`}</div>
                    </div>
                  ); })()}
                  {(() => { const rb=rollBest.write; const faces = rb? rb.faces : facesFor(writing); const val = rb? rb.value : null; const bg = bubbleBg(val||0, faces); return (
                    <div style={{...styles.diceMiniChip, background:bg}} title="Write">
                      <div style={styles.diceLabel}>W</div>
                      <div style={styles.diceVal}>{val? `${val}/${faces}` : `d${faces}`}</div>
                    </div>
                  ); })()}
                  {(() => { const rb=rollBest.perform; const faces = rb? rb.faces : facesFor(stage); const val = rb? rb.value : null; const bg = bubbleBg(val||0, faces); return (
                    <div style={{...styles.diceMiniChip, background:bg}} title="Perform">
                      <div style={styles.diceLabel}>P</div>
                      <div style={styles.diceVal}>{val? `${val}/${faces}` : `d${faces}`}</div>
                    </div>
                  ); })()}
                </div>
              )}
              {isPerforming && (
                <button onClick={skipPerformance} style={{ position:'absolute', right:10, top:10, zIndex:2, ...styles.secondaryBtn }} title="Skip performance">Skip performance</button>
              )}
              {/* Legacy station sprites removed; replaced by anchor overlay above */}

                {/* Nudge badge is rendered inside the room overlay below */}

                <div
                  style={{
                    ...styles.performer,
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) scaleX(${activity === 'walk' && facingLeft ? -1 : 1}) scale(${(activity === 'walk' ? 1.15 : activity === 'singing' ? 1.06 : activity === 'dancing' ? 1.26 : 1) * ((isPerforming && performingVenue === 'ozdustball') ? 0.9 : 1)})${activity === 'dancing' ? ' rotate(2deg)' : ''}${(isPerforming && performingVenue === 'busking') ? ' translate(120px, 20px)' : ''}${(isPerforming && performingVenue === 'ozdustball') ? ' translate(-50px, 15px)' : ''}`,
                  }}
                  title="Your performer"
                >
                  {isPerforming ? (
                    <img src="/art/singing.gif" alt="Performer singing" style={styles.performerImg} />
                  ) : activity === 'walk' ? (
                    <img src="/art/walking.gif" alt="Performer walking" style={styles.performerImg} />
                  ) : activity === 'singing' ? (
                    <img src="/art/singing.gif" alt="Performer singing" style={styles.performerImg} />
                  ) : activity === 'dancing' ? (
                    <img src="/art/dancing.gif" alt="Performer dancing" style={styles.performerImg} />
                  ) : (
                    <img src="/art/idle.gif" alt="Performer idle" style={styles.performerImg} />
                  )}
                  {activity === "write" && <div style={styles.actionEmoji}>??</div>}
                  {activity === "sing" && <div style={styles.actionEmoji}>??</div>}
                  {activity === "dance" && <div style={styles.actionEmoji}>??</div>}
                </div>
                {DICE_MODE && rollFx.show && (
                  <div style={{
                    ...styles.rollBubble,
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    background: (rollFx.faces === 20 || rollFx.faces === 12 || rollFx.faces === 6) ? 'transparent' : bubbleBg(rollFx.current, rollFx.faces),
                    transform: `translate(-50%, -115%) translateY(-45px) translate(${!rollFx.settled ? (((rollFx.current||1)%2===0?-2:2)) : 0}px, ${!rollFx.settled ? ((((rollFx.current||1)%3)-1)*2) : 0}px) rotate(${!rollFx.settled ? (((rollFx.current||1)%2===0?-2:2)) : 0}deg) scale(${(rollFx.faces===12||rollFx.faces===6) ? (rollFx.settled ? (rollFxPulse ? 1.15 : 1.0) : 1.0) : (rollFx.settled?1.12:1)})`,
                    opacity: rollFxFadeOut ? 0 : 1,
                    transition: 'opacity 300ms ease, transform 300ms ease',
                    ...((rollFx.faces === 20 || rollFx.faces === 12 || rollFx.faces === 6) ? { border: 'none', padding: 0, borderRadius: 0, gap: 0, alignItems: 'center' } : {}),
                    ...(bubbleGlow.show ? { boxShadow: (rollFx.faces === 20 || rollFx.faces === 12 || rollFx.faces === 6) ? undefined : `0 0 0 2px ${bubbleGlow.color}, 0 0 12px ${bubbleGlow.color}` } : {})
                  }}>
                    {(rollFx.faces === 20 || rollFx.faces === 12 || rollFx.faces === 6) ? (
                      !rollFx.settled ? (
                        <img
                          src={rollFx.faces === 20 ? '/art/d20.gif' : rollFx.faces === 12 ? '/art/d12.gif' : '/art/d6.gif'}
                          alt={rollFx.faces === 20 ? 'd20 roll' : rollFx.faces === 12 ? 'd12 roll' : 'd6 roll'}
                          style={{ width: 48, height: 48 }}
                        />
                      ) : (
                        <div style={{ fontWeight:900, fontSize: 18 }}>{rollFx.current ?? ''}</div>
                      )
                    ) : (
                      <>
                        <div style={{ fontWeight:800 }}>{rollFx.current ?? ''}</div>
                        <div style={{ fontSize:11, opacity:.85 }}>d{rollFx.faces}</div>
                      </>
                    )}
                  </div>
                )}
                {celebrateFx.show && (
                  <div style={{
                    position:'absolute',
                    left: celebrateFx.phase==='start' ? `${celebrateFx.startX}%` : '50%',
                    top: celebrateFx.phase==='start' ? `${celebrateFx.startY}%` : '50%',
                    transform: celebrateFx.phase==='start'
                      ? 'translate(-50%, -115%) translateY(-75px)'
                      : 'translate(-50%, -50%)',
                    color: celebrateFx.color,
                    fontWeight: 900,
                    fontSize: celebrateFx.phase==='start' ? 14 : 28,
                    opacity: celebrateFx.phase==='fade' ? 0 : 1,
                    transition: 'left 650ms ease, top 650ms ease, transform 650ms ease, font-size 650ms ease, opacity 600ms ease',
                    textShadow: '0 1px 2px rgba(0,0,0,.6)',
                    letterSpacing: 0.3,
                    pointerEvents: 'none',
                    zIndex: 5,
                  }}>{celebrateFx.text}</div>
                )}
                {DICE_MODE && SHOW_DICE_BAR && (
                  <div style={styles.diceOverlay}>
                    {(() => { const rb=rollBest.sing; const faces = rb? rb.faces : facesFor(vocals); const val = rb? rb.value : null; const frac = val? (faces+1-val)/faces : null; const bg = frac==null? 'rgba(0,0,0,.35)' : (frac>=0.66? 'rgba(80,180,120,.55)' : frac>=0.33? 'rgba(200,160,80,.55)' : 'rgba(200,90,90,.55)'); return (
                      <div style={{...styles.diceChip, background:bg}} title="Sing">
                        <div style={styles.diceLabel}>S</div>
                        <div style={styles.diceVal}>{val? `${val}/${faces}` : `d${faces}`}</div>
                      </div>
                    ); })()}
                    {(() => { const rb=rollBest.write; const faces = rb? rb.faces : facesFor(writing); const val = rb? rb.value : null; const frac = val? (faces+1-val)/faces : null; const bg = frac==null? 'rgba(0,0,0,.35)' : (frac>=0.66? 'rgba(80,180,120,.55)' : frac>=0.33? 'rgba(200,160,80,.55)' : 'rgba(200,90,90,.55)'); return (
                      <div style={{...styles.diceChip, background:bg}} title="Write">
                        <div style={styles.diceLabel}>W</div>
                        <div style={styles.diceVal}>{val? `${val}/${faces}` : `d${faces}`}</div>
                      </div>
                    ); })()}
                    {(() => { const rb=rollBest.perform; const faces = rb? rb.faces : facesFor(stage); const val = rb? rb.value : null; const frac = val? (faces+1-val)/faces : null; const bg = frac==null? 'rgba(0,0,0,.35)' : (frac>=0.66? 'rgba(80,180,120,.55)' : frac>=0.33? 'rgba(200,160,80,.55)' : 'rgba(200,90,90,.55)'); return (
                      <div style={{...styles.diceChip, background:bg}} title="Perform">
                        <div style={styles.diceLabel}>P</div>
                        <div style={styles.diceVal}>{val? `${val}/${faces}` : `d${faces}`}</div>
                      </div>
                    ); })()}
                    <button disabled={remaining<=0} onClick={() => setActions((arr)=>[...arr,{t:'rest'}])} style={styles.restBtn}>Rest</button>
                    <div style={{...styles.sub, marginLeft:8}}>Lower rolls are better; better dice reduce worst-case.</div>
                  </div>
                )}
                {/* Overlayed action buttons on room */}
                {!isPerforming && !financeOpen && !endYearReady && !isOver && (
                  <div style={styles.buttonsOverlay}>
                    <div style={styles.actionBtnWrap}>
                      <button disabled={!conceptLocked || remaining<=0} onClick={() => instruct("practice")} style={styles.actionBtn}>
                        <img src={actionButtonSrc('practice')} alt="Sing" style={{
                          ...styles.actionImg,
                          ...((rollRing.show && rollRing.action==='sing') ? { filter: solidOutlineFilter(rollRing.color) } : (rollGlow.sing ? { filter: solidOutlineFilter(rollGlow.sing) } : {})),
                        }} />
                        {DICE_MODE && (rollBest?.sing?.value!=null) && !(rollFx.show && rollFx.action==='sing') && (
                          <div style={styles.actionBtnRoll}>{rollBest.sing.value}</div>
                        )}
                      </button>
                    </div>
                    <div style={styles.actionBtnWrap}>
                      <button disabled={!conceptLocked || remaining<=0} onClick={() => instruct("write")} style={styles.actionBtn}>
                        <img src={actionButtonSrc('write')} alt="Write" style={{
                          ...styles.actionImg,
                          ...((rollRing.show && rollRing.action==='write') ? { filter: solidOutlineFilter(rollRing.color) } : (rollGlow.write ? { filter: solidOutlineFilter(rollGlow.write) } : {})),
                        }} />
                        {DICE_MODE && (rollBest?.write?.value!=null) && !(rollFx.show && rollFx.action==='write') && (
                          <div style={styles.actionBtnRoll}>{rollBest.write.value}</div>
                        )}
                      </button>
                    </div>
                    <div style={styles.actionBtnWrap}>
                      <button disabled={!conceptLocked || remaining<=0} onClick={() => instruct("perform")} style={styles.actionBtn}>
                        <img src={actionButtonSrc('perform')} alt="Perform" style={{
                          ...styles.actionImg,
                          ...((rollRing.show && rollRing.action==='perform') ? { filter: solidOutlineFilter(rollRing.color) } : (rollGlow.perform ? { filter: solidOutlineFilter(rollGlow.perform) } : {})),
                        }} />
                        {DICE_MODE && (rollBest?.perform?.value!=null) && !(rollFx.show && rollFx.action==='perform') && (
                          <div style={styles.actionBtnRoll}>{rollBest.perform.value}</div>
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {/* Bottom-right CTA: Choose venue & perform (replaces centered tick) */}
                {!isPerforming && canRelease && !endYearReady && !isOver && (
                  <button
                    onClick={() => { if (!finishedReady) finishSong(); setVenueOpen(true); }}
                    title="Choose venue & perform"
                    style={styles.performCta}
                  >
                    Choose venue & perform
                  </button>
                )}
                {!isPerforming && (endYearReady || isOver) && (
                  <button
                    onClick={() => { setFinaleSummaryOpen(true); setEndYearReady(false); }}
                    title="End year"
                    style={styles.performCta}
                  >
                    End year
                  </button>
                )}

                {financeOpen && (
                  <div style={styles.overlay} onClick={() => setFinanceOpen(false)}>
                    <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
                      <div style={styles.mirrorFrame}>
                        <div className="hide-scrollbar" style={{ ...styles.mirrorInner, display:'flex', alignItems:'stretch', justifyContent:'center' }}>
                          <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:12, overflow:'hidden' }}>
                            <div style={{ ...styles.desktopIcons, marginLeft: -8, top: 6 }}>
                              <div style={styles.desktopColumn}>
                                <div style={styles.desktopIconWrap}>
                                  <button style={styles.desktopIcon} title="MyBubble" onClick={() => { setSelectedFriendId(null); setShowFriendsList(false); setSocialOpen(true); }}>
                                    <div style={{ position:'relative' }}>
                                      <img src="/art/mybubbleicon.png" alt="MyBubble" style={styles.desktopIconImg} />
                                      {(pendingFriendEvents.length>0 && lastFriendProgressWeek !== week) && (
                                        <div style={{ position:'absolute', right:-2, top:-2, width:14, height:14, borderRadius:99, background:'#e65b7a', border:'1px solid rgba(0,0,0,.4)' }} />
                                      )}
                                    </div>
                                  </button>
                                  <div style={styles.desktopIconLabel}>myBubble</div>
                                </div>
                                <div style={styles.desktopIconWrap}>
                                  <button style={styles.desktopIcon} title="Settings" onClick={() => setMenuOpen(true)}>
                                    <img src="/art/settingicon.png" alt="Settings" style={styles.desktopIconImg} />
                                  </button>
                                  <div style={styles.desktopIconLabel}>Settings</div>
                                </div>
                              </div>
                              <div style={styles.desktopIconWrap}>
                                <button style={styles.desktopIcon} title="My Music" onClick={() => setMyMusicOpen(true)}>
                                  <img src="/art/shizyfiicon.png" alt="My Music" style={styles.desktopIconImg} />
                                </button>
                                <div style={styles.desktopIconLabel}>Shizy-Fi</div>
                              </div>
                              <div style={styles.desktopIconWrap}>
                                <button style={styles.desktopIcon} title="Calendar" onClick={() => setCalendarOpen(true)}>
                                  <img src="/art/calendaricon.png" alt="Calendar" style={styles.desktopIconImg} />
                                </button>
                                <div style={styles.desktopIconLabel}>Calendar</div>
                              </div>
                              <div style={styles.desktopIconWrap}>
                                <button style={styles.desktopIcon} title="Shop" onClick={() => setShopOpen(true)}>
                                  <img src="/art/shopicon.png" alt="Shop" style={styles.desktopIconImg} />
                                </button>
                                <div style={styles.desktopIconLabel}>Am-Oz-on</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Book Gig moved into the computer modal */}
            {/* Gigs count removed per request */}

            {/* Removed old finishedReady CTA block; now handled in-room bottom-right */}
          </section>
        </div>

        {/* Streamlined: hide the persistent last result section */}

        {isOver && suppressFinale && (
          <div style={styles.overlay}>
            <div style={{ ...styles.modal, maxWidth: 460 }}>
              <div style={styles.title}>Year Summary</div>
              <div style={{ marginTop: 8 }}>
                <div style={styles.statRow}><span>Songs Released</span><b>{songHistory.length}</b></div>
                <div style={styles.statRow}><span>Best Chart</span><b>{bestChart != null ? `#${bestChart}` : ''}</b></div>
                <div style={styles.statRow}><span>Best Grade</span><b>{bestGrade ?? ''}</b></div>
                <div style={styles.statRow}><span>Total Earnings</span><b>{songHistory.reduce((sum,s)=> sum + (s.moneyGain||0), 0)}</b></div>
                <div style={styles.statRow}><span>Final Fans</span><b>{fans}</b></div>
                <div style={{ ...styles.sub, marginTop: 8 }}>
                  Thanks for playing Season 1! Start a new year and push for #1.
                </div>
              </div>
              <button onClick={restart} style={{ ...styles.primaryBtn, marginTop: 14 }}>
                Start New Year
              </button>
            </div>
          </div>
        )}

        {friendModal.open && (
          <div style={styles.overlay}>
            <div style={{ position:'relative', width:'100%', maxWidth: 720, height: 360, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 16, padding: 10, overflow:'hidden' }} onClick={(e)=>e.stopPropagation()}>
              <img src={'/art/mybubblelogo.png'} alt="myBubble" onError={(e)=>{ e.currentTarget.style.display='none'; }} style={styles.vnLogo} />
              {(() => {
                const scripts = {
                  luminaO: {
                    1: [
                      { speaker:'lumina', text:"Hey! I caught your Synthwave set by the mirror. Neon-smooth vibes!" },
                      { speaker:'player', text:"Thanks! I'm just getting started." },
                      { speaker:'lumina', text:"I'm Lumina-O. The city needs more glow." },
                      { speaker:'lumina', text:"Let's keep in touch." }
                    ],
                    2: [
                      { speaker:'lumina', text:"Fans notice consistency. Your sound's blooming." },
                      { speaker:'lumina', text:"Here - use this when you need it." }
                    ],
                    3: [ { speaker:'lumina', text:"You've got the hook now. Try a late-night mix - let the bass breathe." } ],
                    4: [ { speaker:'lumina', text:"Top 5! That rush is real. Bask a little. Then write more." } ],
                    5: [
                      { speaker:'lumina', text:"Number one! The circuit lights up for you." },
                      { speaker:'lumina', text:"You earned this. Keep shining." }
                    ]
                  }
                };
                const friendId = friendModal.friendId || 'luminaO';
                const lines = (scripts[friendId] && scripts[friendId][friendModal.targetLevel]) || [ { speaker:'lumina', text:'...' } ];
                const idx = Math.max(0, Math.min(friendModal.idx || 0, lines.length-1));
                const line = lines[idx];
                const isLeft = line.speaker === 'player';
                const leftActive = isLeft;
                const rightActive = !isLeft;
                return (
                  <div>
                    {/* Busts with active speaker emphasis */}
                    <img
                      src={'/art/friends/player_bust.png'}
                      alt="Player"
                      onError={(e)=>{ e.currentTarget.style.display='none'; }}
                      style={{
                        ...styles.vnBustLeft,
                        opacity: leftActive ? 1 : 0.6,
                        transform: `scale(${leftActive ? 1.03 : 0.97})`,
                        transition: 'opacity 200ms ease, transform 200ms ease'
                      }}
                    />
                    <img
                      src={'/art/friends/luminao_bust.png'}
                      alt="Lumina-O"
                      onError={(e)=>{ e.currentTarget.style.display='none'; }}
                      style={{
                        ...styles.vnBustRight,
                        opacity: rightActive ? 1 : 0.6,
                        transform: `translateY(-65px) scale(${rightActive ? 1.03 : 0.97})`,
                        transition: 'opacity 200ms ease, transform 200ms ease'
                      }}
                    />
                    <div style={{ position:'absolute', left: isLeft? 16 : 'auto', right: !isLeft? 16 : 'auto', bottom: 16, maxWidth: 420 }}>
                      <div style={{ ...styles.vnBubble, ...(isLeft? styles.vnBubbleLeft : styles.vnBubbleRight) }}>
                        <div style={{ fontWeight: 800, marginBottom: 4 }}>{isLeft ? (performerName || 'You') : 'Lumina-O'}</div>
                        <div>{vnTyping ? '.'.repeat((vnTypingTick||0)+1) : line.text}</div>
                      </div>
                    </div>
                    <div style={{ position:'absolute', right: 12, top: 12, display:'flex', gap:6 }}>
                      <button
                        style={styles.primaryBtn}
                        onClick={() => {
                          const next = (friendModal.idx||0)+1;
                          if (next < lines.length) {
                            setFriendModal(prev => ({ ...prev, idx: next }));
                          } else {
                            // Complete: apply rewards and level up
                            setFriends(prev => ({ ...prev, [friendId]: { ...prev[friendId], level: Math.max(prev[friendId]?.level||0, friendModal.targetLevel||0) } }));
                            if (friendId==='luminaO' && friendModal.targetLevel === 2 && !(friends?.luminaO?.rewardsClaimed?.[2])) {
                              setNudges(n=>n+1);
                              setFriends(prev => ({ ...prev, luminaO: { ...prev.luminaO, rewardsClaimed: { ...(prev.luminaO.rewardsClaimed||{}), 2:true } } }));
                              pushToast('Lumina-O shared a tip: +1 Nudge');
                            }
                            if (friendId==='luminaO' && friendModal.targetLevel === 5 && !(friends?.luminaO?.rewardsClaimed?.[5])) {
                              setBonusRolls(r=>r+1);
                              try {
                                const all = POSTERS.map((_,i)=>i);
                                const remaining = all.filter(i=> !(unlockedPosters||[]).includes(i));
                                const idxNew = remaining.length>0 ? remaining[0] : (currentPosterIdx ?? 0);
                                if (!(unlockedPosters||[]).includes(idxNew)) setUnlockedPosters(arr=>[...arr, idxNew]);
                                if (currentPosterIdx == null) setCurrentPosterIdx(idxNew);
                              } catch(_) {}
                              setFriends(prev => ({ ...prev, luminaO: { ...prev.luminaO, rewardsClaimed: { ...(prev.luminaO.rewardsClaimed||{}), 5:true }, posterUnlocked:true } }));
                              pushToast('Lumina-O gift: +1 Bonus Roll and a new poster!');
                            }
                            setFriendModal({ open:false, friendId:null, targetLevel:null, idx:0 });
                          }
                        }}
                      >{(friendModal.idx||0) < lines.length-1 ? 'Next' : 'Finish'}</button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {progressOpen && (
          <div style={styles.overlay} onClick={() => setProgressOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '12%', justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.title, textAlign:'center' }}>{conceptLocked ? 'Current Song' : 'Create a new song'}</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>
                {conceptLocked && songName ? (
                  <span style={{ fontSize: 18, fontWeight: 900 }}>Working on: <b>{songName}</b></span>
                ) : (
                  <span style={{ fontSize: 18, fontWeight: 900 }}>No active song yet.</span>
                )}
                {false && DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(stage)}{nextDieInfo(stage) ? ` Next: d${nextDieInfo(stage).f} at ${nextDieInfo(stage).t.toFixed(1)}` : ' Max die unlocked'}
                  </div>
                )}
                {false && DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(stage)}{nextDieInfo(stage) ? ` Next: d${nextDieInfo(stage).f} at ${nextDieInfo(stage).t.toFixed(1)}` : ' Max die unlocked'}
                  </div>
                )}
              </div>
              {conceptLocked && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ ...styles.sub, fontSize: 14 }}>
                    Pairing: <b>{genre}</b> + <b>{theme}</b>
                  </div>
                  <div style={{ marginTop: 6, fontWeight: 800, color: compat>0 ? '#64d49a' : compat<0 ? '#e37a7a' : '#e1b768' }}>
                    {compat>0 ? 'great combination' : compat<0 ? 'risky combination' : 'okay combination'}
                  </div>
                </div>
              )}
              {null}
                </div>
              </div>
            </div>
          </div>
        )}

        {menuOpen && !isOver && (
          <div style={styles.overlay} onClick={() => setMenuOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '12%', justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.title, textAlign:'center' }}>Settings</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>
                Week {week} | Money {'\u00A3'}{money} | Fans {fans}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <button onClick={() => setMenuOpen(false)} style={styles.primaryBtn}>Resume</button>
                <button onClick={saveNow} style={styles.secondaryBtn}>Save now</button>
                <button onClick={() => { clearSave(); setMenuOpen(false); }} style={styles.secondaryBtn}>Clear save</button>
                <button onClick={() => { restart(); setMenuOpen(false); }} style={styles.secondaryBtn}>Restart run</button>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <input type="checkbox" checked={earlyFinishEnabled} onChange={(e)=>setEarlyFinishEnabled(e.target.checked)} />
                  Allow Early Finish (once S/W/P rolled)
                </label>
              </div>
              <div style={{ ...styles.sub, marginTop: 10 }}>Autosave: On</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showWelcome && (
          <div style={styles.overlay} onClick={() => setShowWelcome(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '12%', justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.title, textAlign: 'center' }}>Welcome to Shiz Academy</div>
                  <div style={{ display:'flex', gap:12, alignItems:'center', marginTop: 10 }}>
                    <div style={{ flex:'0 0 204px', display:'flex', justifyContent:'center' }}>
                      <img src="/art/academylogo.png" alt="Shiz Academy Crest" style={{ height: 184, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.25))' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...styles.sub, marginTop: 0, lineHeight: 1.4 }}>
                        This year is all about making music. Create and perform songs across Oz. There is a big celebration at the end of the year. Perhaps you will be able to perform your masterpiece?
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showConcept && !conceptLocked && (
          <div
            style={styles.overlay}
            onClick={(e) => {
              const ae = document.activeElement;
              if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.getAttribute('contenteditable') === 'true')) {
                try { ae.blur(); } catch(_) {}
                e.stopPropagation();
                return;
              }
              setShowConcept(false);
            }}
          >
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '12%', justifyContent: 'flex-start' }}>
                  <div style={{ ...styles.title, textAlign:'center' }}>Create a new song</div>
              <div style={{ ...styles.label, marginTop: 10 }}>Genre</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <select value={genre} onChange={(e)=>setGenre(e.target.value)} style={{ ...styles.input, width:'auto', minWidth: 180, padding:'6px 10px', background:'white', color:'black' }}>
                  {GENRES.map(g => (<option key={g} value={g}>{g}</option>))}
                </select>
              </div>

              <div style={styles.label}>Theme</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <select value={theme} onChange={(e)=>setTheme(e.target.value)} style={{ ...styles.input, width:'auto', minWidth: 200, padding:'6px 10px', background:'white', color:'black' }}>
                  {THEMES.map(t => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>

              <div style={{ ...styles.label, marginTop: 8 }}>Song name</div>
              <div style={styles.inlineRow}>
                <input
                  value={songName}
                  onChange={(e) => setSongName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
                  placeholder="Type a song name..."
                  style={styles.input}
                  enterKeyHint="done"
                />
                <button
                  style={styles.smallBtn}
                  onClick={() => { try { if (document.activeElement) document.activeElement.blur(); } catch(_) {} }}
                >OK</button>
              </div>
              {compat < 0 && (
                <div style={{ ...styles.sub, marginTop: 8, color: 'rgba(255,120,120,.95)' }}>
                  Risky pairing
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => { setConceptLocked(true); setShowConcept(false); const c = compat; setPairFeedback(c>0 ? 'great combination' : c<0 ? 'risky combination' : 'okay combination'); }} disabled={!songName.trim()} style={!songName.trim() ? styles.primaryBtnDisabled : styles.primaryBtn}>Start composing</button>
              </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {statsOpen && (
          <div style={styles.overlay} onClick={() => setStatsOpen(false)}>
            <div style={{ ...styles.mirrorModal, transform: mirrorAnim? 'scale(1) translateY(0)' : 'scale(.985) translateY(-6px)', opacity: mirrorAnim? 1 : 0, transition: 'transform 220ms ease, opacity 220ms ease' }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', right: '13%', bottom: '4%', left: '15%', justifyContent: 'flex-start' }}>
                  <div style={{ marginTop: 0, display:'flex', gap:16, alignItems:'flex-start', paddingLeft: 50 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginLeft: -40 }}>
                      <div style={styles.portraitWrap}>
                        <img src="/art/mirrorportrait.png" alt="Performer portrait" style={styles.portraitImg} />
                      </div>
                      <div style={{
                        ...styles.title,
                        textAlign: 'center',
                        marginTop: 4,
                        fontFamily: "'Lobster', cursive",
                        fontWeight: 400,
                        color: '#fff',
                        WebkitTextStroke: '1px #6b4a2b',
                        textShadow: '1px 0 #6b4a2b, -1px 0 #6b4a2b, 0 1px #6b4a2b, 0 -1px #6b4a2b'
                      }}>
                        {editingName ? (
                          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                            <input
                              autoFocus
                              value={tempName}
                              onChange={(e)=>setTempName(e.target.value)}
                              onKeyDown={(e)=>{ if(e.key==='Enter'){ setPerformerName(tempName.trim()||'Your Performer'); setEditingName(false);} if(e.key==='Escape'){ setEditingName(false);} }}
                              style={{ ...styles.input, height:32, fontWeight:800 }}
                            />
                            <button className="btn" onClick={()=>{ setPerformerName(tempName.trim()||'Your Performer'); setEditingName(false); }} style={styles.smallBtn}>Save</button>
                          </div>
                        ) : (
                          <span onClick={()=>{ setTempName(performerName); setEditingName(true); }} title="Click to rename" style={{ cursor:'text' }}>{performerName}</span>
                        )}
                      </div>
                    </div>
                    <div style={{ flex:1 }}>
                  <div style={styles.progressLabel}><span>Vocals</span></div>
                {(() => { 
                  const pr = dieProgress(vocals); const pct = Math.round((pr.pct||0)*100); const nextLabel = pr.next? `d${pr.next}` : 'MAX';
                  const col1 = '#B084F5', col2 = '#7A4CC4';
                  return (
                  <div style={{ ...styles.progressTrack, display:'flex', alignItems:'center', gap:10, padding:'5px 10px', background:'rgba(176,132,245,.15)', border:'1px solid rgba(176,132,245,.35)', borderRadius:12, width:'72%' }}>
                    {dieBadgePath(pr.curr) ? (
                      <div style={{...styles.dieBadgeWrap, marginLeft:-6}}>
                        <img src={dieBadgePath(pr.curr)} alt={`d${pr.curr}`} style={styles.dieBadge} />
                        <div style={styles.dieBadgeText}>d{pr.curr}</div>
                      </div>
                    ) : (
                      <div style={{ ...styles.dieToken, background:'linear-gradient(180deg,#c39af7,#8d60d8)', border:'1px solid rgba(176,132,245,.8)' }}>d{pr.curr}</div>
                    )}
                    <div style={{ position:'relative', flex:1, height:9, borderRadius:999, background:'rgba(255,255,255,.08)', boxShadow:'inset 0 2px 4px rgba(0,0,0,.25), 0 1px 2px rgba(255,255,255,.15)' }}>
                      <div style={{ position:'absolute', inset:0, borderRadius:999, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(180deg, ${col1}, ${col2})` }} />
                        <div style={{ position:'absolute', inset:0, borderRadius:999, background:'linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0))' }} />
                      </div>
                      {pr.next && (
                        <div style={{ position:'absolute', left:`calc(${pct}% - 5px)`, top:'50%', transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:999, background:'#fff', boxShadow:'0 0 7px rgba(176,132,245,.9)', border:'1px solid #6d49b7' }} />
                      )}
                    </div>
                    {dieBadgePath(pr.next) ? (
                      <div style={{...styles.dieBadgeWrap, marginRight:-6}}>
                        <img src={dieBadgePath(pr.next)} alt={`d${pr.next}`} style={styles.dieBadge} />
                        <div style={styles.dieBadgeText}>{nextLabel}</div>
                      </div>
                    ) : (
                      <div style={{ ...styles.dieToken, background:'linear-gradient(180deg,#d7c4fb,#9a79e5)', border:'1px solid rgba(176,132,245,.8)', opacity: pr.next? 1 : .5 }}>{nextLabel}</div>
                    )}
                  </div>
                ); })()}
                
                {false && DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(vocals)}{nextDieInfo(vocals) ? ` ? Next: d${nextDieInfo(vocals).f} at = ${nextDieInfo(vocals).t.toFixed(1)}` : ' ? Max die unlocked'}
                  </div>
                )}
                {false && DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(vocals)}{nextDieInfo(vocals) ? ` Next: d${nextDieInfo(vocals).f} at ${nextDieInfo(vocals).t.toFixed(1)}` : ' Max die unlocked'}
                  </div>
                )}

                <div style={styles.progressLabel}><span>Writing</span></div>
                {(() => { 
                  const pr = dieProgress(writing); const pct = Math.round((pr.pct||0)*100); const nextLabel = pr.next? `d${pr.next}` : 'MAX';
                  const col1 = '#5FE7D9', col2 = '#2AA296';
                  return (
                  <div style={{ ...styles.progressTrack, display:'flex', alignItems:'center', gap:10, padding:'5px 10px', background:'rgba(95,231,217,.12)', border:'1px solid rgba(95,231,217,.35)', borderRadius:12, width:'72%' }}>
                    {dieBadgePath(pr.curr) ? (
                      <div style={{...styles.dieBadgeWrap, marginLeft:-6}}>
                        <img src={dieBadgePath(pr.curr)} alt={`d${pr.curr}`} style={styles.dieBadge} />
                        <div style={styles.dieBadgeText}>d{pr.curr}</div>
                      </div>
                    ) : (
                      <div style={{ ...styles.dieToken, background:'linear-gradient(180deg,#8ff1e8,#3dbbb0)', border:'1px solid rgba(95,231,217,.7)' }}>d{pr.curr}</div>
                    )}
                    <div style={{ position:'relative', flex:1, height:9, borderRadius:999, background:'rgba(255,255,255,.08)', boxShadow:'inset 0 2px 4px rgba(0,0,0,.25), 0 1px 2px rgba(255,255,255,.15)' }}>
                      <div style={{ position:'absolute', inset:0, borderRadius:999, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(180deg, ${col1}, ${col2})` }} />
                        <div style={{ position:'absolute', inset:0, borderRadius:999, background:'linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0))' }} />
                      </div>
                      {pr.next && (
                        <div style={{ position:'absolute', left:`calc(${pct}% - 5px)`, top:'50%', transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:999, background:'#fff', boxShadow:'0 0 7px rgba(95,231,217,.9)', border:'1px solid #1f7f76' }} />
                      )}
                    </div>
                    {dieBadgePath(pr.next) ? (
                      <div style={{...styles.dieBadgeWrap, marginRight:-6}}>
                        <img src={dieBadgePath(pr.next)} alt={`d${pr.next}`} style={styles.dieBadge} />
                        <div style={styles.dieBadgeText}>{nextLabel}</div>
                      </div>
                    ) : (
                      <div style={{ ...styles.dieToken, background:'linear-gradient(180deg,#c0f7f0,#70d9cf)', border:'1px solid rgba(95,231,217,.7)', opacity: pr.next? 1 : .5 }}>{nextLabel}</div>
                    )}
                  </div>
                ); })()}
                
                {false && DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(writing)}{nextDieInfo(writing) ? ` ? Next: d${nextDieInfo(writing).f} at = ${nextDieInfo(writing).t.toFixed(1)}` : ' ? Max die unlocked'}
                  </div>
                )}
                {false && DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(writing)}{nextDieInfo(writing) ? ` Next: d${nextDieInfo(writing).f} at ${nextDieInfo(writing).t.toFixed(1)}` : ' Max die unlocked'}
                  </div>
                )}

                <div style={styles.progressLabel}><span>Stage</span></div>
                {(() => { 
                  const pr = dieProgress(stage); const pct = Math.round((pr.pct||0)*100); const nextLabel = pr.next? `d${pr.next}` : 'MAX';
                  const col1 = '#F7D774', col2 = '#C79C2A';
                  return (
                  <div style={{ ...styles.progressTrack, display:'flex', alignItems:'center', gap:10, padding:'5px 10px', background:'rgba(247,215,116,.12)', border:'1px solid rgba(247,215,116,.35)', borderRadius:12, width:'72%' }}>
                    {dieBadgePath(pr.curr) ? (
                      <div style={{...styles.dieBadgeWrap, marginLeft:-6}}>
                        <img src={dieBadgePath(pr.curr)} alt={`d${pr.curr}`} style={styles.dieBadge} />
                        <div style={styles.dieBadgeText}>d{pr.curr}</div>
                      </div>
                    ) : (
                      <div style={{ ...styles.dieToken, background:'linear-gradient(180deg,#ffe39c,#e1b951)', border:'1px solid rgba(247,215,116,.7)' }}>d{pr.curr}</div>
                    )}
                    <div style={{ position:'relative', flex:1, height:9, borderRadius:999, background:'rgba(255,255,255,.08)', boxShadow:'inset 0 2px 4px rgba(0,0,0,.25), 0 1px 2px rgba(255,255,255,.15)' }}>
                      <div style={{ position:'absolute', inset:0, borderRadius:999, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background:`linear-gradient(180deg, ${col1}, ${col2})` }} />
                        <div style={{ position:'absolute', inset:0, borderRadius:999, background:'linear-gradient(180deg, rgba(255,255,255,.35), rgba(255,255,255,0))' }} />
                      </div>
                      {pr.next && (
                        <div style={{ position:'absolute', left:`calc(${pct}% - 5px)`, top:'50%', transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:999, background:'#fff', boxShadow:'0 0 7px rgba(247,215,116,.9)', border:'1px solid #c29a2a' }} />
                      )}
                    </div>
                    {dieBadgePath(pr.next) ? (
                      <div style={{...styles.dieBadgeWrap, marginRight:-6}}>
                        <img src={dieBadgePath(pr.next)} alt={`d${pr.next}`} style={styles.dieBadge} />
                        <div style={styles.dieBadgeText}>{nextLabel}</div>
                      </div>
                    ) : (
                      <div style={{ ...styles.dieToken, background:'linear-gradient(180deg,#ffeab6,#f2cd62)', border:'1px solid rgba(247,215,116,.7)', opacity: pr.next? 1 : .5 }}>{nextLabel}</div>
                    )}
                  </div>
                ); })()}
                
                {false && DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(stage)}{nextDieInfo(stage) ? ` ? Next: d${nextDieInfo(stage).f} at = ${nextDieInfo(stage).t.toFixed(1)}` : ' ? Max die unlocked'}
                  </div>
                )}
                    </div>
                  </div>
                  {null}
                </div>
              </div>
            </div>
          </div>
        )}

        {false && financeOpen}

        {socialOpen && (
          <div
            style={styles.overlay}
            onClick={() => {
              if (selectedFriendId != null) { setSelectedFriendId(null); return; }
              if (showFriendsList) { setShowFriendsList(false); return; }
              setSocialOpen(false);
            }}
          >
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner }}>
              <div style={styles.title}>MyBubble</div>
              {!showFriendsList && (
              <div style={{ display:'flex', gap:12, marginTop: 8 }}>
                <div style={{ flex:1 }}>
                  <div style={styles.statRow}><span>Fans</span><b>{fans}</b></div>
                  {(() => {
                    const targetWeek = Math.max(1, week - 1);
                    const entry = (songHistory||[]).find(s=> s.releaseWeek === targetWeek);
                    const gain = entry && typeof entry.fansGain === 'number' ? entry.fansGain : 0;
                    return (<div style={styles.statRow}><span>Fans this week</span><b>+{gain}</b></div>);
                  })()}
                  <div style={{ marginTop: 10, border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:10 }}>
                    <div style={{ fontWeight:900, marginBottom:6 }}>Friend Requests</div>
                    {(pendingFriendEvents && pendingFriendEvents.length>0 && lastFriendProgressWeek !== week) ? (
                      (()=>{ const ev = pendingFriendEvents[0]; const name = 'Lumina-O'; const title = ev.targetLevel===1? 'Friend request' : `Friend event (Lv ${ev.targetLevel})`; return (
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                          <div>
                            <div style={{ fontWeight:800 }}>{title}</div>
                            <div style={{ ...styles.sub }}>from {name}</div>
                          </div>
                          <div style={{ display:'flex', gap:6 }}>
                            <button style={styles.smallBtn} onClick={()=>{
                              setFriendModal({ open:true, friendId: ev.friendId, targetLevel: ev.targetLevel, idx:0 });
                              setPendingFriendEvents(prev=> prev.slice(1));
                              setLastFriendProgressWeek(week);
                              setSocialOpen(false);
                            }}>Accept</button>
                            <button style={styles.smallBtn} onClick={()=>{ /* Later: keep in queue */ }}>Later</button>
                          </div>
                        </div>
                      ); })()
                    ) : (
                      <div style={styles.sub}>No new requests.</div>
                    )}
                  </div>
                  {(friends?.luminaO?.level||0) >= 1 && (
                    <div style={{ marginTop: 8 }}>
                      <button
                        style={styles.smallBtn}
                        onClick={() => {
                          setSelectedFriendId(null);
                          setShowFriendsList(v => !v);
                        }}
                      >
                        {showFriendsList ? 'Back to MyBubble' : 'My Friends'}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ flex:1.4, border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:10 }}>
                  <div style={{ fontWeight:900, marginBottom:6 }}>This Week's Buzz</div>
                  {(() => {
                    // Find latest release for current calendar week (week-1), fallback to most recent entry
                    const targetWeek = Math.max(1, week - 1);
                    let entry = (songHistory||[]).find(s=> s.releaseWeek === targetWeek);
                    if (!entry) entry = (songHistory||[])[0];
                    if (!entry) return (<div style={styles.sub}>No songs yet. Release a song to see fan comments.</div>);
                    const header = (
                      <div style={{ marginBottom:8 }}>
                        <div style={{ fontWeight:800 }}>{entry.songName || 'Your Song'}</div>
                        <div style={{ ...styles.sub }}>Grade {entry.grade}</div>
                      </div>
                    );
                    let comments = entry.fanComments && entry.fanComments.length ? entry.fanComments : generateFanComments(entry, performerName);
                    // Sanitize legacy metadata-style last line (e.g., 'Grade X - Genre - Theme')
                    const cleaned = comments.filter(c => !/^Grade\s/i.test((c||'').trim()));
                    if (cleaned.length < 3) {
                      while (cleaned.length < 3) cleaned.push('Loving the growth each week!');
                    }
                    comments = cleaned.slice(0,3);
                    return (
                      <>
                      {header}
                      <div style={{ display:'grid', gap:8 }}>
                        {comments.slice(0,3).map((t,i)=> {
                          const idx = fanIdxFor(targetWeek, i, seedTs);
                          return (
                            <div key={i} style={{ border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:8, display:'flex', alignItems:'center', gap:8 }}>
                              <div style={fanAvatarStyle(idx, 44, fanSpriteMeta)} />
                              <div style={{ ...styles.sub, opacity:.95 }}>{t}</div>
                            </div>
                          );
                        })}
                      </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              )}
              {showFriendsList && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontWeight:900 }}>{selectedFriendId ? 'Friend' : 'Friends'}</div>
                    <button style={styles.smallBtn} onClick={()=> { setSelectedFriendId(null); setShowFriendsList(false); }}>Back to MyBubble</button>
                  </div>
                  {selectedFriendId == null && (
                    <>
                      <div style={{ display:'grid', gap:8 }}>
                        {(() => {
                          const list = [];
                          const lv = friends?.luminaO?.level || 0;
                          if (lv>0) list.push({ id:'luminaO', name:'Lumina-O', level: lv, max: 5 });
                          if (list.length===0) return (<div style={styles.sub}>No friends yet. Complete requests in MyBubble when available.</div>);
                          return list.map(f => (
                            <button key={f.id} onClick={() => setSelectedFriendId(f.id)} style={{ textAlign:'left', background:'transparent', color:'inherit', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:10, cursor:'pointer' }}>
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <div style={{ fontWeight:800 }}>{f.name}</div>
                                <div style={{ ...styles.sub, fontWeight:800 }}>Lv {f.level}/{f.max}</div>
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </>
                  )}
                  {selectedFriendId != null && (
                    (()=>{
                      const fid = selectedFriendId;
                      const meta = fid==='luminaO' ? { name:'Lumina-O', bio: (friends?.luminaO?.bio || { title:'Lumina-O', summary:'Synthwave artist', bullets:[] }) } : { name: fid, bio:{ title: fid, summary:'', bullets:[] } };
                      return (
                        <div style={{}}>
                          <div style={{ fontWeight:900, margin:'8px 0 6px' }}>{meta.bio.title}</div>
                          <div style={{ ...styles.sub, marginBottom:6 }}>{meta.bio.summary}</div>
                          {meta.bio.bullets && meta.bio.bullets.length>0 && (
                            <ul style={styles.ul}>
                              {meta.bio.bullets.map((b,i)=>(<li key={i} style={styles.li}>{b}</li>))}
                            </ul>
                          )}
                          <div style={{ marginTop: 8, display:'flex', gap:8, alignItems:'center' }}>
                            <img src={'/art/friends/luminao_bust.png'} alt={meta.name} style={{ width: 120, height:'auto', objectFit:'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.35))' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                            <div style={{ ...styles.sub }}>Level: <b>{friends?.luminaO?.level||0}</b>/5</div>
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <button style={styles.smallBtn} onClick={()=> setSelectedFriendId(null)}>Back to Friends</button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
              {null}
                </div>
              </div>
            </div>
          </div>
        )}

        {eventModal && eventModal.event && (
          <div style={styles.overlay} onClick={() => setEventModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>{eventModal.event.title}</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>{eventModal.event.details}</div>
              {eventModal.event.choices && (
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop: 10 }}>
                  {eventModal.event.choices.map((ch, idx) => (
                    <button key={idx} style={styles.secondaryBtn} onClick={() => {
                      // Apply immediate effect (grant/fanMult only matters this week, handled via activeEffects once stored)
                      if (ch.effect && typeof ch.effect.grantMoney === 'number') setMoney(m=>m+ch.effect.grantMoney);
                      setEventsResolved(r => ({ ...r, [eventModal.event.id]: { status:'choice', choiceIndex: idx } }));
                      setEventModal(null);
                    }}>{ch.label}</button>
                  ))}
                </div>
              )}
              {!eventModal.event.choices && (
                <button onClick={() => setEventModal(null)} style={{ ...styles.primaryBtn, marginTop: 14 }}>Okay</button>
              )}
            </div>
          </div>
        )}

        {eventInfoModal && (
          <div style={styles.overlay} onClick={() => setEventInfoModal(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>This Week: {Math.min(week, MAX_WEEKS)} / {MAX_WEEKS}</div>
              <div style={{ marginTop: 6, display:'grid', gap:6 }}>
                {(!eventInfoModal.events || eventInfoModal.events.length === 0) ? (
                  <div style={styles.sub}>Nothing scheduled.</div>
                ) : (
                  eventInfoModal.events.map(ev => (
                    <div key={ev.id}>
                      <div style={{ fontWeight: 700 }}>{ev.title}</div>
                      <div style={{ ...styles.sub }}>{ev.short}</div>
                      {ev.effect && (
                        <div style={{ ...styles.sub, opacity: .9 }}>{effectSummary(ev.effect)}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
              {pendingFriendEvents.length>0 && lastFriendProgressWeek !== week && (
                <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.15)' }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Social</div>
                  <div style={styles.sub}>New friend request available in MyBubble.</div>
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Upcoming</div>
                {eventInfoModal.upcoming ? (
                  <div>
                    <div style={{ fontWeight: 700 }}>{eventInfoModal.upcoming.title}</div>
                    <div style={{ ...styles.sub }}>{eventInfoModal.upcoming.short}</div>
                  </div>
                ) : (
                  <div style={styles.sub}>No upcoming events.</div>
                )}
              </div>
              {(() => {
                const list = trendsByWeek && trendsByWeek[week];
                if (!list || list.length === 0) return null;
                const playerItem = list.find(it => it && it.isPlayer);
                if (!playerItem) return null;
                const msg = playerItem.rank === 1
                  ? 'Your song is number 1 in the charts!'
                  : `Your song made the Top 5 at #${playerItem.rank}.`;
                return (
                  <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,.15)' }}>
                    <div style={{ fontWeight: 800, marginBottom: 4 }}>Charts</div>
                    <div style={styles.sub}>{msg}</div>
                  </div>
                );
              })()}
              <button onClick={() => {
                setEventsResolved(r => {
                  const copy = { ...r };
                  (eventInfoModal.events||[]).forEach(ev => {
                    const prev = copy[ev.id] || {};
                    copy[ev.id] = { ...prev, notified: true };
                  });
                  return copy;
                });
                setEventInfoModal(null);
              }} style={{ ...styles.primaryBtn, marginTop: 12 }}>OK</button>
            </div>
          </div>
        )}

        {nudgeOpen && (
          <div style={styles.overlay} onClick={() => setNudgeOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Use Nudge</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>Nudges available: <b>{nudges}</b></div>
              <div style={{ display:'grid', gap:8, marginTop: 10 }}>
                <button
                  disabled={!rollBest?.sing || (rollBest?.sing?.value||1) <= 1 || nudges<=0 || !!rollBest?.sing?.nudged}
                  onClick={() => {
                    if (nudges>0 && rollBest?.sing && rollBest.sing.value>1 && !rollBest.sing.nudged){
                      setRollBest(r=>({ ...r, sing: { ...r.sing, value: Math.max(1, (r.sing?.value||1)-1), nudged:true } }));
                      setNudges(n=>n-1);
                      pushToast('Nudge used on Sing: -1');
                    }
                  }}
                  style={(!rollBest?.sing || (rollBest?.sing?.value||1) <= 1 || nudges<=0 || !!rollBest?.sing?.nudged) ? styles.primaryBtnDisabled : styles.primaryBtn}
                >Sing +1</button>
                <button
                  disabled={!rollBest?.write || (rollBest?.write?.value||1) <= 1 || nudges<=0 || !!rollBest?.write?.nudged}
                  onClick={() => {
                    if (nudges>0 && rollBest?.write && rollBest.write.value>1 && !rollBest.write.nudged){
                      setRollBest(r=>({ ...r, write: { ...r.write, value: Math.max(1, (r.write?.value||1)-1), nudged:true } }));
                      setNudges(n=>n-1);
                      pushToast('Nudge used on Write: -1');
                    }
                  }}
                  style={(!rollBest?.write || (rollBest?.write?.value||1) <= 1 || nudges<=0 || !!rollBest?.write?.nudged) ? styles.primaryBtnDisabled : styles.primaryBtn}
                >Write +1</button>
                <button
                  disabled={!rollBest?.perform || (rollBest?.perform?.value||1) <= 1 || nudges<=0 || !!rollBest?.perform?.nudged}
                  onClick={() => {
                    if (nudges>0 && rollBest?.perform && rollBest.perform.value>1 && !rollBest.perform.nudged){
                      setRollBest(r=>({ ...r, perform: { ...r.perform, value: Math.max(1, (r.perform?.value||1)-1), nudged:true } }));
                      setNudges(n=>n-1);
                      pushToast('Nudge used on Perform: -1');
                    }
                  }}
                  style={(!rollBest?.perform || (rollBest?.perform?.value||1) <= 1 || nudges<=0 || !!rollBest?.perform?.nudged) ? styles.primaryBtnDisabled : styles.primaryBtn}
                >Dance +1</button>
              </div>
              <button onClick={() => setNudgeOpen(false)} style={{ ...styles.primaryBtn, marginTop: 14 }}>Close</button>
            </div>
          </div>
        )}

        {shopOpen && (
          <div style={styles.overlay} onClick={() => setShopOpen(false)}>
            <div style={{ ...styles.mirrorModal, transform: shopAnim? 'scale(1) translateY(0)' : 'scale(.985) translateY(-6px)', opacity: shopAnim? 1 : 0, transition: 'transform 220ms ease, opacity 220ms ease' }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={styles.mirrorInner}>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ flex:'0 0 auto', border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:10, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.05)', width:'fit-content', margin:'0 auto', marginTop: 160 }}>
                      <img src="/art/shoplogo.png" alt="Shop" style={{ height: 96, width: 'auto', objectFit:'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.25))' }} />
                    </div>
                    <div style={{ flex:0.95 }}>
                    <div style={{ display:'grid', gap:8 }}>
                      {(() => { const disc = activeEffects?.shopDiscount || 1; const price20 = Math.max(1, Math.ceil(15 * disc)); const price12 = Math.max(1, Math.ceil(40 * disc)); const price6 = Math.max(1, Math.ceil(100 * disc)); return (<>
                      <div style={{ border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:8 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:4 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                            <img src="/art/d20badge.png" alt="d20" style={{ width:36, height:36, objectFit:'contain' }} />
                            Extra d20 roll
                          </div>
                          <button
                            disabled={money < price20}
                            onClick={() => { if (money>=price20){ setMoney(m=>m-price20); setBonusRolls(r=>r+1); setNextRollOverride(20); pushToast('Purchased: Extra d20 roll (+1) - next roll uses d20'); } }}
                            style={money<price20? { ...styles.primaryBtnDisabled, ...styles.shopBuyBtn, marginLeft:'auto' } : { ...styles.smallBtn, ...styles.shopBuyBtn, marginLeft:'auto' }}
                          >Buy ({'\u00A3'}{price20})</button>
                        </div>
                      </div>
                      <div style={{ border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:8 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:4 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                            <img src="/art/d12badge.png" alt="d12" style={{ width:36, height:36, objectFit:'contain' }} />
                            Extra d12 roll
                          </div>
                          <button
                            disabled={money < price12}
                            onClick={() => { if (money>=price12){ setMoney(m=>m-price12); setBonusRolls(r=>r+1); setNextRollOverride(12); pushToast('Purchased: Extra d12 roll (+1) - next roll uses d12'); } }}
                            style={money<price12? { ...styles.primaryBtnDisabled, ...styles.shopBuyBtn, marginLeft:'auto' } : { ...styles.smallBtn, ...styles.shopBuyBtn, marginLeft:'auto' }}
                          >Buy ({'\u00A3'}{price12})</button>
                        </div>
                      </div>
                      <div style={{ border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:8 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:4 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                            <img src="/art/d6badge.png" alt="d6" style={{ width:36, height:36, objectFit:'contain' }} />
                            Extra d6 roll
                          </div>
                          <button
                            disabled={money < price6}
                            onClick={() => { if (money>=price6){ setMoney(m=>m-price6); setBonusRolls(r=>r+1); setNextRollOverride(6); pushToast('Purchased: Extra d6 roll (+1) - next roll uses d6'); } }}
                            style={money<price6? { ...styles.primaryBtnDisabled, ...styles.shopBuyBtn, marginLeft:'auto' } : { ...styles.smallBtn, ...styles.shopBuyBtn, marginLeft:'auto' }}
                          >Buy ({'\u00A3'}{price6})</button>
                        </div>
                      </div>
                      </>); })()}
                      </div>
                      {/* Mystery Poster */}
                      <div style={{ border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:8 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:4 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                            <img src="/art/posters/poster1.png" alt="poster" style={{ width:36, height:36, objectFit:'cover', borderRadius:6 }} />
                            Mystery Poster
                          </div>
                          {(() => { const disc = activeEffects?.shopDiscount || 1; const priceP = 1; const disabled = money < priceP; return (
                            <button
                              disabled={disabled}
                              onClick={() => {
                                if (!disabled) {
                                  setMoney(m=>m-priceP);
                                  setUnlockedPosters(prev => {
                                    const all = POSTERS.map((_,i)=>i);
                                    const remaining = all.filter(i => !prev.includes(i));
                                    const pool = remaining.length>0 ? remaining : all;
                                    const pick = pool[Math.floor(Math.random()*pool.length)];
                                    setCurrentPosterIdx(pick);
                                    pushToast(remaining.length>0 ? 'Unlocked a new poster!' : 'Swapped to another poster!');
                                    return prev.includes(pick) ? prev : [...prev, pick];
                                  });
                                }
                              }}
                              style={disabled? { ...styles.primaryBtnDisabled, ...styles.shopBuyBtn, marginLeft:'auto' } : { ...styles.smallBtn, ...styles.shopBuyBtn, marginLeft:'auto' }}
                            >Buy ({'\u00A3'}{priceP})</button>
                          ); })()}
                        </div>
                      </div>
                      <div style={{ border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:8 }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:4 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                            <img src="/art/nudgebadge.png" alt="nudge" style={{ width:36, height:36, objectFit:'contain' }} />
                            Nudge
                          </div>
                          {(() => { const disc = activeEffects?.shopDiscount || 1; const priceN = Math.max(1, Math.ceil(30 * disc)); return (
                            <button
                              disabled={money < priceN}
                              onClick={() => { if (money>=priceN){ setMoney(m=>m-priceN); setNudges(n=>n+1); pushToast('Purchased: Nudge (+1)'); } }}
                              style={money<priceN? { ...styles.primaryBtnDisabled, ...styles.shopBuyBtn, marginLeft:'auto' } : { ...styles.smallBtn, ...styles.shopBuyBtn, marginLeft:'auto' }}
                            >Buy ({'\u00A3'}{priceN})</button>
                          ); })()}
                        </div>
                      </div>
                      {/* Permanent boost items styled like other shop items */}
                      <div style={{ border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:8 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                            <img src="/art/honey.png" alt="honey" style={{ width:28, height:28, objectFit:'contain' }} onError={(e)=>{e.currentTarget.style.display='none';}} />
                            Soothing Honey Drink
                            {(() => {
                              const dp = dieProgress(vocals);
                              if (!dp || !dp.next) return null;
                              const floor = dp.floor||0, goal = dp.goal||6;
                              const currPct = Math.max(0, Math.min(1, (vocals - floor) / Math.max(0.0001, goal - floor)));
                              const newStat = Math.min(10, vocals + 0.2);
                              const newPct = Math.max(0, Math.min(1, (newStat - floor) / Math.max(0.0001, goal - floor)));
                              const delta = Math.max(0, newPct - currPct);
                              return <span style={{ ...styles.sub, marginLeft:6 }}>+{Math.round(delta*100)}% toward d{dp.next}</span>;
                            })()}
                          </div>
                          {(() => {
                            const disc = activeEffects?.shopDiscount || 1; const price = Math.max(1, Math.ceil(120 * disc)); const disabled = money < price || vocals >= 10;
                            return (
                              <button
                                disabled={disabled}
                                onClick={() => { if (!disabled){ setMoney(m=>m-price); setVocals(v=>clamp(v+0.2,0,10)); pushToast('Purchased: Soothing Honey Drink (+0.20 Vocals)'); } }}
                                style={disabled? { ...styles.primaryBtnDisabled, ...styles.shopBuyBtn, marginLeft:'auto' } : { ...styles.smallBtn, ...styles.shopBuyBtn, marginLeft:'auto' }}
                              >Buy ({'\u00A3'}{price})</button>
                            );
                          })()}
                        </div>
                      </div>
                      <div style={{ border:'1px solid rgba(255,255,255,.2)', borderRadius:10, padding:8 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-start', gap:8 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:6, fontWeight:700 }}>
                            <img src="/art/notebook.png" alt="notebook" style={{ width:28, height:28, objectFit:'contain' }} onError={(e)=>{e.currentTarget.style.display='none';}} />
                            Lyric Notebook
                            {(() => {
                              const dp = dieProgress(writing);
                              if (!dp || !dp.next) return null;
                              const floor = dp.floor||0, goal = dp.goal||6;
                              const currPct = Math.max(0, Math.min(1, (writing - floor) / Math.max(0.0001, goal - floor)));
                              const newStat = Math.min(10, writing + 0.2);
                              const newPct = Math.max(0, Math.min(1, (newStat - floor) / Math.max(0.0001, goal - floor)));
                              const delta = Math.max(0, newPct - currPct);
                              return <span style={{ ...styles.sub, marginLeft:6 }}>+{Math.round(delta*100)}% toward d{dp.next}</span>;
                            })()}
                          </div>
                          {(() => {
                            const disc = activeEffects?.shopDiscount || 1; const price = Math.max(1, Math.ceil(120 * disc)); const disabled = money < price || writing >= 10;
                            return (
                              <button
                                disabled={disabled}
                                onClick={() => { if (!disabled){ setMoney(m=>m-price); setWriting(v=>clamp(v+0.2,0,10)); pushToast('Purchased: Lyric Notebook (+0.20 Writing)'); } }}
                                style={disabled? { ...styles.primaryBtnDisabled, ...styles.shopBuyBtn, marginLeft:'auto' } : { ...styles.smallBtn, ...styles.shopBuyBtn, marginLeft:'auto' }}
                              >Buy ({'\u00A3'}{price})</button>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {myMusicOpen && (
          <div style={styles.overlay} onClick={() => setMyMusicOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '12%', justifyContent: 'flex-start' }}>
              <div style={{ ...styles.title, textAlign: 'center' }}>Shizy-Fi</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop: 10 }}>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-start' }}>
                  {(!endYearReady && !isOver) ? (
                    <button
                      onClick={() => {
                        setMyMusicOpen(false);
                        if (!conceptLocked) setShowConcept(true); else setProgressOpen(true);
                      }}
                      style={styles.primaryBtn}
                    >
                      {conceptLocked ? 'Current Song' : 'Create Song'}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setMyMusicOpen(false); setFinaleSummaryOpen(true); setEndYearReady(false); }}
                      style={styles.primaryBtn}
                    >
                      End year
                    </button>
                  )}
                  <button onClick={() => { setMyMusicOpen(false); setHistoryOpen(true); }} style={styles.secondaryBtn}>My Song History</button>
                  {null}
                </div>
                <div style={{ border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:10, width:'100%', overflow:'hidden' }}>
                  <div style={{ fontWeight:900, marginBottom:6 }}>Global Trends (Week {Math.min(week, MAX_WEEKS)})</div>
                  {(() => { const list = trendsByWeek && trendsByWeek[week]; if (!list) { ensureTrendsForWeek(week); return (<div style={styles.sub}>Loading trends...</div>);} return (
                    <div style={{ overflowY:'auto', overflowX:'hidden', maxHeight: (list && list.length >= 5) ? 320 : 'none', paddingRight:4 }}>
                      <div style={{ display:'grid', gap:8 }}>
                      {list.map(item => (
                        <div key={`${item.rank}-${item.title}`} onClick={() => playTrendItem(item)} style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:8, background: (playingTrend && playingTrend.id === `${item.artist}__${item.title}`) ? 'rgba(255,255,255,.08)' : (item.isPlayer? 'rgba(100,212,154,.14)' : 'transparent'), cursor:'pointer' }}>
                          <div style={{ minWidth:26, height:26, borderRadius:8, background:'rgba(255,255,255,.12)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900 }}>#{item.rank}</div>
                          <div style={{ width:30, height:30, borderRadius:6, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, overflow:'hidden', position:'relative' }}>
                            {item.cover && (
                              <img src={item.cover} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={(e)=>{ e.currentTarget.style.display='none'; }} />
                            )}
                            {!item.cover && (
                              <span>{item.artist.slice(0,1)}</span>
                            )}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:800, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.artist} - {(item.title && item.title.length>22) ? (item.title.slice(0,22) + '...') : item.title}</div>
                            {(playingTrend && playingTrend.id === `${item.artist}__${item.title}`) && (
                              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                                <div style={{ fontSize:11, opacity:.85 }}>{fmtTime(audioTime.current)} / {fmtTime(audioTime.duration)}</div>
                                <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,.15)', width:120, overflow:'hidden' }}>
                                  <div style={{ width: `${Math.max(0, Math.min(100, (audioTime.duration>0? (audioTime.current/audioTime.duration)*100 : 0)))}%`, height:'100%', background:'white' }} />
                                </div>
                              </div>
                            )}
                            {item.isPlayer && <div style={{ ...styles.sub, fontWeight:800, color:'#64d49a' }}>You</div>}
                          </div>
                          <button title="Preview" style={{ ...styles.smallBtn, padding:'6px 8px' }}>Play</button>
                        </div>
                      ))}
                      </div>
                    </div>
                  ); })()}
                </div>
              </div>
              {null}
                </div>
              </div>
            </div>
          </div>
        )}

        {calendarOpen && (
          <div style={styles.overlay} onClick={() => setCalendarOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner }}>
              <div style={{ ...styles.title, textAlign:'center' }}>Calendar</div>
              <div style={{ marginTop: 8 }}>
                <div style={styles.statRow}><span>Week</span><b>{Math.min(week, MAX_WEEKS)} / {MAX_WEEKS}</b></div>
              </div>
              {!!activeEvents.length && (
                <div style={{ marginTop: 8 }}>
                  <div style={styles.h3}>This Week</div>
                  {activeEvents.map(ev => (
                    <div key={ev.id} style={{ ...styles.sub }}>
                      <b>{ev.title}</b> {'\u2014'} {ev.short}
                      {ev.effect && (
                        <div style={{ opacity: .9 }}>{effectSummary(ev.effect)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {eventsSchedule && (
                <div style={{ marginTop: 8 }}>
                  <div style={styles.h3}>Upcoming</div>
                  {eventsSchedule.filter(e => e.week > week).slice(0,4).map(ev => (
                    <div key={ev.id} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0' }}>
                      <span>W{ev.week} {'\u00B7'} {ev.title}</span>
                      <span style={{ ...styles.sub }}>{ev.short}</span>
                    </div>
                  ))}
                  {eventsSchedule.filter(e => e.week > week).length === 0 && (
                    <div style={styles.sub}>No upcoming events.</div>
                  )}
                </div>
              )}
              <button
                disabled={weekMode === 'song'}
                onClick={() => { if (weekMode==='song'){ pushToast("I'm too deep in the creative process to book a gig this week."); return; } setCalendarOpen(false); setGigOpen(true); setSelectedGigSong(null); }}
                style={{ ...styles.secondaryBtn, marginTop: 10 }}
              >
                Book Gig (uses this week)
              </button>
              {null}
                </div>
              </div>
            </div>
          </div>
        )}

        {pairFeedback && (
          <div style={styles.overlay} onClick={() => setPairFeedback(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>{pairFeedback}</div>
              <button onClick={() => setPairFeedback(null)} style={{ ...styles.primaryBtn, marginTop: 14 }}>
                Close
              </button>
            </div>
          </div>
        )}

        {releaseOpen && lastResult && (
          <div style={styles.overlay} onClick={() => setReleaseOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '12%', justifyContent: 'flex-start' }}>
                  <div style={styles.title}>Release Results</div>
                  <div style={{ marginTop: 8, paddingBottom: 8 }}>
                    <div style={{ ...styles.sub, marginBottom: 6 }}>
                      Song: <b>{lastResult.songName}</b> - {lastResult.genre} / {lastResult.theme}
                    </div>
                    <div style={styles.statRow}><span>Critics Score</span><b>{lastResult.score}</b></div>
                    <div style={styles.statRow}><span>Grade</span><b>{lastResult.grade}</b></div>
                    <div style={styles.statRow}><span>Top 100 Charts</span><b>#{lastResult.chartPos}</b></div>
                    {lastResult.venue && (
                      <div style={styles.statRow}><span>Venue</span><b>{lastResult.venue}</b></div>
                    )}
                    <div style={styles.review}>
                      "{lastResult.review}"
                    </div>
                    <div style={{ ...styles.sub, marginTop: 8 }}>
                      +{'\u00A3'}{lastResult.moneyGain} +{lastResult.fansGain} fans
                    </div>
                    {lastResult.feedback && lastResult.feedback.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={styles.h3}>Suggestions</div>
                        <ul style={styles.ul}>
                          {lastResult.feedback.map((t, i) => (
                            <li key={i} style={styles.li}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <button
                onClick={() => {
                  setReleaseOpen(false);
                  if (finalePending && lastResult && lastResult.releaseWeek === MAX_WEEKS && !isPerforming && !suppressFinale) {
                    setFinalePending(false);
                    setEndYearReady(true);
                  }
                }}
                style={{ ...styles.primaryBtn, marginTop: 12 }}
              >
                Continue
              </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Poster collection modal */}
        {posterOpen && (
          <div style={styles.overlay} onClick={() => setPosterOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '10%', justifyContent: 'flex-start' }}>
                  <div style={styles.title}>My Poster Collection</div>
                  {(!unlockedPosters || unlockedPosters.length === 0) ? (
                    <div style={{ ...styles.sub, marginTop: 8 }}>No posters unlocked yet. Buy a Mystery Poster from the shop!</div>
                  ) : (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: 8 }}>
                      <button key="none" onClick={() => setCurrentPosterIdx(null)} style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.04)', border:'1px dashed rgba(255,255,255,.25)', borderRadius: 10, padding: 6, cursor: 'pointer' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 8, background:'rgba(255,255,255,.05)', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,.7)', fontWeight:800, fontSize:12 }}>No Poster</div>
                        <div style={{ fontSize: 12, opacity: .9, fontWeight: 700 }}>None</div>
                      </button>
                      {unlockedPosters.map((idx) => (
                        <button key={idx} onClick={() => setCurrentPosterIdx(idx)} style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.2)', borderRadius: 10, padding: 6, cursor: 'pointer' }}>
                          <img src={POSTERS[idx]} alt={`Poster ${idx+1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, filter:'drop-shadow(0 2px 6px rgba(0,0,0,.3))' }} />
                          <div style={{ fontSize: 12, opacity: .9, fontWeight: 700 }}>{idx+1}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setPosterOpen(false)} style={{ ...styles.primaryBtn, marginTop: 12 }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {venueOpen && (
          <div style={styles.overlay} onClick={() => setVenueOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, top: '22%', bottom: '8%', justifyContent: 'flex-start' }}>
                  <div style={styles.title}>Choose Venue & Perform</div>
                  <div style={{ ...styles.sub, marginTop: 6 }}>Pick a venue for your finished song.</div>
                  <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                    {Object.entries(VENUES).map(([key, v]) => {
                      // Simple textual forecast
                      let expected = 0;
                      if (DICE_MODE) {
                        const s = rollBest.sing ? ((rollBest.sing.faces + 1 - rollBest.sing.value) / rollBest.sing.faces) : 0;
                        const w = rollBest.write ? ((rollBest.write.faces + 1 - rollBest.write.value) / rollBest.write.faces) : 0;
                        const p = rollBest.perform ? ((rollBest.perform.faces + 1 - rollBest.perform.value) / rollBest.perform.faces) : 0;
                        expected = Math.round(clamp((0.34*s+0.33*w+0.33*p)*92 + computePairBonus(genre, theme, false), 0, 100));
                      } else {
                        const triadE = actions.reduce((acc,a)=> a.t==='gig'? acc : acc + (a.m||0)+(a.l||0)+(a.p||0), 0);
                        const baseE = triadE * 5;
                        const earlyF = Math.min(1, 0.75 + (week - 1) * 0.05);
                        expected = Math.round(
                          clamp(baseE * earlyF + computePairBonus(genre, theme, false), 0, 100)
                        );
                      }
                      const margin = expected - (v.breakEven ?? 0);
                      const risk = v.cost === 0 ? 'None' : margin >= 5 ? 'Low' : margin >= 0 ? 'Edge' : 'High';
                      const turnout = v.fanMult >= 2 ? 'Huge' : v.fanMult >= 1.4 ? 'High' : v.fanMult >= 1 ? 'Medium' : 'Low';
                      const fansPot = v.fanMult >= 2 ? 'Massive' : v.fanMult >= 1.4 ? 'Big' : v.fanMult >= 1 ? 'Solid' : 'Small';
                      const locked = (fans < (VENUE_FAN_REQ[key] ?? 0));
                      const isSwingy = (compat < 0);
                      const reqText = VENUE_FAN_REQ[key] ? `Requires ${VENUE_FAN_REQ[key]} fans` : null;
                      return (
                        <div key={key} style={{ border: '1px solid rgba(255,255,255,.2)', borderRadius: 12, padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700 }}>
                              {v.name}
                            </div>
                            <div style={{ ...styles.sub }}>
                              Cost: {'\u00A3'}{v.cost}
                            </div>
                          </div>
                          <div style={{ ...styles.sub, marginTop: 6 }}>{v.desc}</div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: 12, opacity: .9 }}>
                            <div>Turnout: <b>{turnout}</b></div>
                            <div>Risk: <b>{risk}</b></div>
                            <div>Fans: <b>{fansPot}</b></div>
                            {isSwingy && <div style={{ color: 'rgba(255,220,140,.95)' }}>Swingy</div>}
                            {locked && reqText && <div style={{ color: 'rgba(255,120,120,.9)' }}>{reqText}</div>}
                          </div>
                          <button disabled={locked} onClick={() => performRelease(key)} style={{ ...(locked ? styles.primaryBtnDisabled : styles.primaryBtn), marginTop: 8 }}>
                            Perform here
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gigOpen && (
          <div style={styles.overlay} onClick={() => setGigOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner, justifyContent: 'flex-start' }}>
                  <div style={styles.title}>Book Gig</div>
                  <div style={{ ...styles.sub, marginTop: 6 }}>Play an older song to earn money/fans. Uses 1 day (max 3 gigs per week).</div>
                  <div className="hide-scrollbar" style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: 6 }}>
                {songHistory.length === 0 ? (
                  <div style={styles.sub}>No past songs yet.</div>
                ) : (
                  songHistory.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.songName}</div>
                        <div style={{ ...styles.sub }}>Grade {s.grade} | #{s.chartPos}</div>
                      </div>
                      <button style={styles.smallBtn} onClick={() => setSelectedGigSong(s)}>Select</button>
                    </div>
                  ))
                )}
                  </div>
              {selectedGigSong && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ ...styles.sub, marginBottom: 6 }}>Selected: <b>{selectedGigSong.songName}</b> | Fixed score {selectedGigSong.score}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {Object.entries(VENUES).map(([key, v]) => {
                      const expected = selectedGigSong.score;
                      const margin = expected - (v.breakEven ?? 0);
                      const risk = v.cost === 0 ? 'None' : margin >= 5 ? 'Low' : margin >= 0 ? 'Edge' : 'High';
                      const turnout = v.fanMult >= 2 ? 'Huge' : v.fanMult >= 1.4 ? 'High' : v.fanMult >= 1 ? 'Medium' : 'Low';
                      const fansPot = v.fanMult >= 2 ? 'Massive' : v.fanMult >= 1.4 ? 'Big' : v.fanMult >= 1 ? 'Solid' : 'Small';
                      const locked = (fans < (VENUE_FAN_REQ[key] ?? 0));
                      const reqText = VENUE_FAN_REQ[key] ? `Requires ${VENUE_FAN_REQ[key]} fans` : null;
                      const capReached = weeklyGigs >= MAX_GIGS_PER_WEEK;
                      return (
                        <div key={key} style={{ border: '1px solid rgba(255,255,255,.2)', borderRadius: 12, padding: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 700 }}>{v.name}</div>
                            <div style={{ ...styles.sub }}>Cost: {'\u00A3'}{v.cost}</div>
                          </div>
                          <div style={{ ...styles.sub, marginTop: 6 }}>{v.desc}</div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: 12, opacity: .9 }}>
                            <div>Turnout: <b>{turnout}</b></div>
                            <div>Risk: <b>{risk}</b></div>
                            <div>Fans: <b>{fansPot}</b></div>
                            {locked && reqText && <div style={{ color: 'rgba(255,120,120,.9)' }}>{reqText}</div>}
                            {capReached && <div style={{ color: 'rgba(255,120,120,.9)' }}>Weekly gig cap reached</div>}
                          </div>
                          <button
                            disabled={locked}
                            onClick={() => {
                              // New gig flow: consumes the whole week immediately
                              const vCfg = VENUES[key] ?? VENUES.busking;
                              const score = selectedGigSong.score;
                              const grade = selectedGigSong.grade;
                              const fansGainByGrade = { S: 60, A: 40, B: 25, C: 12, D: 5 };
                              const fanBonus = Math.floor(fans * 0.05);
                              const weeksSinceRelease = Math.max(0, week - (selectedGigSong.releaseWeek || week));
                              const freshness = Math.max(0.6, 1 - 0.08 * weeksSinceRelease);
                              let fansGainLocal = Math.round((fansGainByGrade[grade] + fanBonus) * (vCfg.fanMult ?? 1) * freshness * (activeEffects?.fanMult || 1));
                              const marginLocal = score - (vCfg.breakEven ?? 0);
                              let gross = Math.max(0, marginLocal) * (vCfg.payoutPerPoint ?? 0) * freshness * (activeEffects?.payoutMult || 1);
                              let net = Math.floor(gross - (vCfg.cost ?? 0));
                              if (key === 'busking') net = Math.max(vCfg.tipFloor ?? 5, net);
                              if (week <= 3) net = Math.max(net, -20);
                              setWeekMode('gig');
                              setMoney((m) => m + net);
                              setFans((f) => f + fansGainLocal);
                              // Modest stat training for a gig-focused week
                              const boost = key === 'busking' ? 1.1 : 1.0;
                              const stageGain = 0.25 * boost;
                              const vocalsGain = 0.12 * boost;
                              setStage((v) => clamp(v + stageGain, 0, 10));
                              setVocals((v) => clamp(v + vocalsGain, 0, 10));
                              // Record gig into history entry
                              setSongHistory((arr) => {
                                const copy = arr.slice();
                                const idx = copy.findIndex((e) => e.songName === selectedGigSong.songName && e.releaseWeek === selectedGigSong.releaseWeek);
                                if (idx >= 0) {
                                  const entry = { ...(copy[idx] || {}) };
                                  entry.gigs = [...(entry.gigs || []), { week, venue: vCfg.name, moneyGain: net, fansGain: fansGainLocal }];
                                  copy[idx] = entry;
                                }
                                return copy;
                              });
                              setGigResult({ venue: vCfg.name, money: net, fans: fansGainLocal, stageGain, vocalsGain });
                              setGigOpen(false);
                              // Advance to next week immediately
                              setWeek((w) => w + 1);
                              resetWeekProgress();
                              setGigResultOpen(true);
                            }}
                            style={{ ...(locked ? styles.primaryBtnDisabled : styles.primaryBtn), marginTop: 8 }}
                          >
                            Book this gig (use week)
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
                  <button onClick={() => setGigOpen(false)} style={{ ...styles.primaryBtn, marginTop: 12 }}>Close</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Finale: choose a past song to perform at Katie's Birthday Party */}
        {finaleOpen && (
          <div style={styles.overlay} onClick={() => setFinaleOpen(false)}>
            <div style={{ ...styles.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Katie's Birthday Celebration</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>Pick a favorite song from your history to perform at Katie's Birthday Party.</div>
              <div style={{ marginTop: 8, maxHeight: 260, overflowY: 'auto', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: 6 }}>
                {songHistory.length === 0 ? (
                  <div style={styles.sub}>No past songs yet.</div>
                ) : (
                  songHistory.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.songName}</div>
                        <div style={{ ...styles.sub }}>Grade {s.grade} | #{s.chartPos}</div>
                      </div>
                      <button style={styles.smallBtn} onClick={() => setFinaleSong(s)}>Select</button>
                    </div>
                  ))
                )}
              </div>
              <button
                disabled={!finaleSong}
                onClick={() => {
                  if (!finaleSong) return;
                  setFinaleOpen(false);
                  setPerformingVenue('katieparty');
                  setIsPerforming(true);
                  setFinaleInProgress(true);
                  setTarget(null);
                  setPos({ x: 50, y: 62 });
                  // End performance after a brief ceremony
                  setTimeout(() => { setIsPerforming(false); }, 6000);
                }}
                style={!finaleSong ? styles.primaryBtnDisabled : styles.primaryBtn}
              >
                Perform at Katie's Party
              </button>
              <button onClick={() => setFinaleOpen(false)} style={{ ...styles.secondaryBtn, marginTop: 8 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Finale Summary (appears after Week 52 release, before party) */}
        {finaleSummaryOpen && (
          <div style={styles.overlay}>
            <div style={{ ...styles.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Year Summary</div>
              <div style={{ marginTop: 8 }}>
                {(() => {
                  const top = songHistory.slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,5);
                  const totalMoney = songHistory.reduce((sum, s) => sum + (s.moneyGain||0) + (Array.isArray(s.gigs)? s.gigs.reduce((gSum,g)=>gSum+(g.moneyGain||0),0):0), 0);
                  const bestChart = songHistory.reduce((best, s) => (s.chartPos && s.chartPos>0) ? Math.min(best||Infinity, s.chartPos) : best, null);
                  return (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Top 5 Songs</div>
                      {top.length === 0 ? (
                        <div style={styles.sub}>No songs released this year.</div>
                      ) : (
                        <div style={{ display:'grid', gap:6 }}>
                          {top.map((s,i)=>(
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:8 }}>
                              <div><b>#{i+1}</b> {s.songName}</div>
                              <div>Score <b>{s.score}</b> | Grade <b>{s.grade}</b></div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ ...styles.statRow, marginTop: 10 }}><span>Total Fans</span><b>{fans}</b></div>
                      <div style={styles.statRow}><span>Total Money Earned</span><b>{'\u00A3'}{totalMoney}</b></div>
                      <div style={styles.statRow}><span>Best Chart Position</span><b>{bestChart ? `#${bestChart}` : '-'}</b></div>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display:'flex', gap:8, marginTop: 12 }}>
                <button onClick={() => { setFinaleSummaryOpen(false); setFinaleOpen(true); }} style={styles.primaryBtn}>Celebrate Katie's Birthday</button>
              </div>
            </div>
          </div>
        )}

        {gigResultOpen && gigResult && (
          <div style={styles.overlay} onClick={() => setGigResultOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Gig Results</div>
              <div style={{ marginTop: 8 }}>
                <div style={styles.statRow}><span>Venue</span><b>{gigResult.venue}</b></div>
                <div style={styles.statRow}><span>Money</span><b>{'\u00A3'}{gigResult.money}</b></div>
                <div style={styles.statRow}><span>Fans</span><b>+{gigResult.fans}</b></div>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <div style={{ padding:'6px 10px', border:'1px solid rgba(255,255,255,.25)', borderRadius:999, background:'rgba(255,255,255,.08)' }}>
                    Stage <b>+{(gigResult.stageGain||0).toFixed(2)}</b>
                  </div>
                  <div style={{ padding:'6px 10px', border:'1px solid rgba(255,255,255,.25)', borderRadius:999, background:'rgba(255,255,255,.08)' }}>
                    Vocals <b>+{(gigResult.vocalsGain||0).toFixed(2)}</b>
                  </div>
                </div>
                <div style={{ ...styles.sub, marginTop: 8 }}>A full week on the road boosted your skills.</div>
              </div>
              <button onClick={() => setGigResultOpen(false)} style={{ ...styles.primaryBtn, marginTop: 12 }}>Continue</button>
            </div>
          </div>
        )}

        {/* Finale ending options after party performance */}
        {finaleEndOpen && (
          <div style={styles.overlay} onClick={() => setFinaleEndOpen(false)}>
            <div style={{ ...styles.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Season Complete</div>
              <div style={{ ...styles.sub, marginTop: 8 }}>Thanks for celebrating at Katie's Birthday!</div>
              <div style={{ marginTop: 8 }}>
                {(() => {
                  const top = songHistory.slice().sort((a,b)=> (b.score||0)-(a.score||0)).slice(0,5);
                  const totalMoney = songHistory.reduce((sum, s) => sum + (s.moneyGain||0) + (Array.isArray(s.gigs)? s.gigs.reduce((gSum,g)=>gSum+(g.moneyGain||0),0):0), 0);
                  const bestChart = songHistory.reduce((best, s) => (s.chartPos && s.chartPos>0) ? Math.min(best||Infinity, s.chartPos) : best, null);
                  return (
                    <div>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>Top 5 Songs</div>
                      {top.length === 0 ? (
                        <div style={styles.sub}>No songs released this year.</div>
                      ) : (
                        <div style={{ display:'grid', gap:6 }}>
                          {top.map((s,i)=>(
                            <div key={i} style={{ display:'flex', justifyContent:'space-between', border:'1px solid rgba(255,255,255,.15)', borderRadius:10, padding:8 }}>
                              <div><b>#{i+1}</b> {s.songName}</div>
                              <div>Score <b>{s.score}</b> | Grade <b>{s.grade}</b></div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ ...styles.statRow, marginTop: 10 }}><span>Total Fans</span><b>{fans}</b></div>
                      <div style={styles.statRow}><span>Total Money Earned</span><b>{'\u00A3'}{totalMoney}</b></div>
                      <div style={styles.statRow}><span>Best Chart Position</span><b>{bestChart ? `#${bestChart}` : '-'}</b></div>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display:'flex', gap:8, marginTop: 12 }}>
                <button onClick={() => { setFinaleEndOpen(false); restart(); }} style={styles.primaryBtn}>Start New Game</button>
                <button onClick={() => { setSuppressFinale(true); setFinaleEndOpen(false); }} style={styles.secondaryBtn}>Continue playing (for fun)</button>
              </div>
            </div>
          </div>
        )}

        {historyOpen && (
          <div style={styles.overlay} onClick={() => setHistoryOpen(false)}>
            <div style={{ ...styles.mirrorModal }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.mirrorFrame}>
                <div className="hide-scrollbar" style={{ ...styles.mirrorInner }}>
                  <div style={{ ...styles.title, textAlign:'center' }}>My Song History</div>
                  <div style={{ marginTop: 8, maxHeight: 360, overflowY: 'auto' }}>
                    {songHistory.length === 0 ? (
                      <div style={styles.sub}>No releases yet.</div>
                    ) : (
                      songHistory.map((s, idx) => (
                        <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span>
                              <b>{s.songName}</b>
                              <span style={{ opacity: .7 }}> | #{s.chartPos}</span>
                            </span>
                            <span>
                              <span style={{ opacity: .8, marginRight: 8 }}>{s.grade}</span>
                              <b>+{s.moneyGain}</b>
                            </span>
                          </div>
                          {(s.gigs && s.gigs.length>0) && (
                            <div style={{ marginTop: 6, fontSize: 12, opacity: .9 }}>
                              Gigs: {s.gigs.length}
                              <div style={{ marginTop: 4 }}>
                                {s.gigs.slice(-3).reverse().map((g, i2) => (
                                  <div key={i2} style={{ display:'flex', justifyContent:'space-between' }}>
                                    <span>Week {g.week} | {g.venue}</span>
                                    <span>+{'\u00A3'}{g.moneyGain} +{g.fansGain} fans</span>
                                  </div>
                                ))}
                                {s.gigs.length > 3 && <div style={{ opacity: .7 }}>(+{s.gigs.length - 3} more)</div>}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// (TimeRow removed in favor of per-instruction buttons)

const styles = {
  page: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    display: 'block',
    margin: 0,
    padding: 0,
    background: '#0b0f19',
    color: 'white',
    fontFamily: "'Fredoka', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  card: {
    width: "100vw",
    maxWidth: "100vw",
    height: "100dvh",
    minHeight: "100svh",
    background: "#121a2b",
    borderRadius: 0,
    padding: 0,
    position: "relative",
    boxShadow: "0 10px 30px rgba(0,0,0,.35)",
  },
  headerRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 22, fontWeight: 800 },
  sub: { opacity: 0.8, fontSize: 13 },
  resourceRow: { display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" },
  pill: {
    background: "#0f1524",
    padding: "8px 10px",
    borderRadius: 999,
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    marginTop: 0,
    height: '100%',
  },
  roomOuter: { display: "flex", justifyContent: "center", marginTop: 0, marginBottom: 0, height: '100%' },
  section: {
    background: "transparent",
    borderRadius: 0,
    padding: 0,
  },
  h3: { margin: 0, marginBottom: 8, fontSize: 16 },
  statRow: { display: "flex", justifyContent: "space-between", padding: "4px 0" },
  label: { fontSize: 12, opacity: 0.8, marginTop: 8 },
  rowWrap: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 },
  inlineRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 6 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.25)",
    background: "transparent",
    color: "white",
    padding: "0 10px",
    fontSize: 14,
  },
  lockNote: {
    display: "inline-block",
    border: "1px solid rgba(255,255,255,.25)",
    borderRadius: 999,
    padding: "4px 10px",
    fontSize: 12,
    opacity: 0.8,
  },
  room: {
    position: "relative",
    height: '100%',
    width: '100%',
    borderRadius: 0,
    backgroundImage: "url('/art/apartmentbackground.png')",
    backgroundSize: "auto 100%",
    backgroundPosition: "center center",
    backgroundRepeat: "no-repeat",
    border: "none",
    boxShadow: "inset 0 -20px 30px rgba(0,0,0,.3)",
    overflow: "hidden",
    marginBottom: 0,
  },
  roomAnchors: {
    position: 'absolute',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    height: '100%',
    aspectRatio: '3168 / 1344',
    pointerEvents: 'auto',
  },
  station: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    fontSize: 20,
    opacity: 0.9,
  },
  stationImg: {
    width: 144,
    height: 144,
    objectFit: 'contain',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.3))',
  },
  computerImg: {
    width: 72,
    height: 72,
    objectFit: 'contain',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.3))',
  },
  actionImg: {
    width: 95,
    height: 95,
    objectFit: 'contain',
    pointerEvents: 'none',
  },
  actionBtnWrap: { position:'relative', display:'inline-block' },
  actionBtnRoll: {
    position:'absolute',
    left: 26,
    bottom: 43,
    color: '#574483',
    fontWeight: 900,
    fontSize: 8,
    textShadow: '0 2px 4px rgba(0,0,0,.7)',
    zIndex: 10,
    pointerEvents: 'none',
    transform: 'translateX(-50%)',
    width: 18,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontVariantNumeric: 'tabular-nums',
  },
  chairImg: {
    width: 72,
    height: 72,
    objectFit: 'contain',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.3))',
  },
  performer: {
    position: "absolute",
    width: 125,
    height: 125,
    borderRadius: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    color: "#111",
    boxShadow: "none",
    transition: "transform 120ms ease",
    cursor: "pointer",
  },
  performerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    pointerEvents: 'none',
    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.3))',
  },
  actionEmoji: {
    position: "absolute",
    top: -18,
    right: -10,
    fontSize: 16,
    display: 'none',
  },
  hud: {
    position: "absolute",
    top: 8,
    left: 8,
    background: "rgba(0,0,0,.38)",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 10,
    padding: "6px 8px",
    color: "#fff",
    backdropFilter: "blur(2px)",
    boxShadow: "0 4px 12px rgba(0,0,0,.2)",
    minWidth: 120,
  },
  hudLine: { fontSize: 12, lineHeight: 1.2, opacity: 0.95 },
  avatarRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #fff, #ddd)",
    color: "#111",
    fontSize: 26,
    boxShadow: "0 4px 12px rgba(0,0,0,.25)",
  },
  speech: {
    flex: 1,
    background: "#0f1524",
    border: "1px solid rgba(255,255,255,.15)",
    borderRadius: 12,
    padding: "6px 10px",
  },
  speechText: { fontSize: 13, opacity: 0.95 },
  btnOn: {
    background: "white",
    color: "black",
    border: "none",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 700,
  },
  btnOff: {
    background: "transparent",
    color: "white",
    border: "1px solid rgba(255,255,255,.25)",
    borderRadius: 999,
    padding: "8px 12px",
    fontWeight: 600,
  },
  smallBtn: {
    background: "transparent",
    color: "white",
    border: "1px solid rgba(255,255,255,.25)",
    borderRadius: 10,
    padding: "8px 10px",
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    position: 'relative',
    background: 'transparent',
    border: 'none',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  queue: { display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 6, marginTop: 6 },
  queueCellOn: { height: 34, borderRadius: 8, background: "white", color: "black", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 },
  queueCellOff: { height: 34, borderRadius: 8, border: "1px dashed rgba(255,255,255,.25)", color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
  weekStrip: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 10 },
  dayCell: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  dayLabel: { fontSize: 10, opacity: 0.75 },
  dayIconOn: { width: 34, height: 34, borderRadius: 8, background: "white", color: "black", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 },
  dayIconOff: { width: 34, height: 34, borderRadius: 8, border: "1px dashed rgba(255,255,255,.25)", color: "rgba(255,255,255,.5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 },
  primaryBtn: {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 12,
    border: "none",
    background: "white",
    color: "black",
    fontWeight: 900,
    fontSize: 16,
    fontFamily: "'Fredoka', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  primaryBtnDisabled: {
    width: "100%",
    marginTop: 10,
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.25)",
    background: "transparent",
    color: "rgba(255,255,255,.6)",
    fontWeight: 900,
    fontSize: 16,
    fontFamily: "'Fredoka', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  secondaryBtn: {
    background: "transparent",
    color: "white",
    border: "1px solid rgba(255,255,255,.25)",
    borderRadius: 12,
    padding: "8px 10px",
    fontWeight: 700,
    fontFamily: "'Fredoka', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  resultTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  grade: {
    width: 42,
    height: 42,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "white",
    color: "black",
    fontWeight: 900,
    fontSize: 18,
  },
  review: { marginTop: 8, fontSize: 14, opacity: 0.95 },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 16,
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  overlayClear: {
    position: 'absolute',
    inset: 0,
    background: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    borderRadius: 0,
    zIndex: 1000,
    backdropFilter: 'none',
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    background: "#0f1524",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.4)",
  },
  shopModalFrame: {
    position: 'relative',
    width: '100%',
    background: 'transparent',
    borderRadius: 0,
    padding: 0,
    // Maintain the frame's intrinsic aspect so it never distorts
    aspectRatio: '88 / 47',
    overflow: 'visible'
  },
  shopFrameOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: "url('/art/newmodalframe.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    pointerEvents: 'none',
    zIndex: 2,
    filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.35))'
  },
  shopModalInner: {
    position: 'absolute',
    // Safe area inside frame (nudged down 10%, right 5%)
    top: '22%',
    right: '13%',
    bottom: '4%',
    left: '15%',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    gap: 6,
    fontSize: 14,
    zIndex: 1,
  },
  shopCloseBtn: {
    position: 'absolute',
    left: '50%',
    bottom: '3.5%',
    transform: 'translateX(-50%)',
    zIndex: 3,
    maxWidth: 160,
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 10,
  },
  mirrorModal: {
    width: '100%',
    maxWidth: 560,
    background: 'transparent',
    borderRadius: 16,
    padding: 0,
    boxShadow: 'none'
  },
  mirrorFrame: {
    position: 'relative',
    width: '100%',
    minHeight: 0,
    borderRadius: 16,
    backgroundImage: "url('/art/modalframe.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center bottom',
    backgroundRepeat: 'no-repeat',
    overflow: 'hidden',
    aspectRatio: '2112 / 1500',
    filter: 'drop-shadow(0 0 16px rgba(160,255,200,.15))'
  },
  mirrorInner: {
    position: 'absolute',
    // Safe area inside the modal frame
    top: '16%',
    right: '12%',
    bottom: '12%',
    left: '12%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 10,
    overflowY: 'auto'
  },
  // Compact shop buy button to reduce width
  shopBuyBtn: {
    padding: '6px 8px',
    fontSize: 12,
    minWidth: 0,
    whiteSpace: 'nowrap',
    width: 'auto',
    flex: '0 0 auto',
  },
  ul: { margin: '6px 0 0 18px', padding: 0 },
  li: { fontSize: 13, lineHeight: 1.4, opacity: 0.95 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 900, letterSpacing: .2, textTransform: 'uppercase', opacity: 0.95, marginTop: 8 },
  progressTrack: { height: 12, borderRadius: 7, background: 'rgba(255,255,255,.12)', overflow: 'visible', marginTop: 4 },
  progressFill: { height: '100%', background: 'white' },
  dieToken: { minWidth: 23, height: 14, borderRadius: 9, background:'rgba(255,255,255,.15)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:10, border:'1px solid rgba(255,255,255,.3)', boxShadow:'inset 0 1px 0 rgba(255,255,255,.25), 0 2px 6px rgba(0,0,0,.25)' },
  dieBadge: { width: 25, height: 25, objectFit: 'contain', filter:'drop-shadow(0 1px 2px rgba(0,0,0,.35))' },
  dieBadgeWrap: { position:'relative', width: 29, height: 29, display:'flex', alignItems:'center', justifyContent:'center', zIndex: 2 },
  dieBadgeText: { position:'absolute', color:'#fff', fontWeight:900, fontSize: 11, textShadow: '0 1px 2px rgba(0,0,0,.6)',  },
  portraitWrap: { width: 160, height: 160, borderRadius: 999, background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'none', border:'none', marginTop: 10 },
  portraitImg: { width: 140, height: 140, borderRadius: 999, objectFit: 'cover', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.25))' },
  progressHelp: { fontSize: 11, opacity: 0.8, marginTop: 4 },
  barRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  barLabel: { width: 90, fontSize: 12 },
  barTrack: { position:'relative', flex: 1, height: 14, borderRadius: 8, background: 'rgba(255,255,255,.08)', overflow: 'hidden' },
  barBackGrid: { position:'absolute', inset:0, background: 'linear-gradient(90deg, rgba(255,255,255,.08) 0 20%, transparent 20% 40%, rgba(255,255,255,.08) 40% 60%, transparent 60% 80%, rgba(255,255,255,.08) 80% 100%)' },
  barRight: { width: 96, textAlign: 'right', fontSize: 12 },
  barMarkers: { position: 'absolute', inset: 0, pointerEvents: 'none' },
  barTick: { position:'absolute', top: 0, width: 2, height: '100%', background: 'rgba(255,255,255,.5)', borderRadius: 1, boxShadow: '0 0 4px rgba(0,0,0,.25)' },
  buttonsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%) translateY(30px)',
    display: 'flex',
    gap: 8,
    padding: 0,
    borderRadius: 0,
    background: 'transparent',
    backdropFilter: 'none',
    zIndex: 2,
  },
  toastWrap: {
    position: 'fixed',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    zIndex: 2000,
  },
  toast: {
    background: 'rgba(0,0,0,.75)',
    color: 'white',
    border: '1px solid rgba(255,255,255,.3)',
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 13,
    boxShadow: '0 6px 16px rgba(0,0,0,.35)'
  },
  hudMoney: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'rgba(0,0,0,.55)',
    border: '1px solid rgba(255,255,255,.35)',
    padding: '6px 10px',
    borderRadius: 12,
    fontSize: 13,
    zIndex: 3,
  },
  hudRolls: {
    position: 'absolute',
    top: 8,
    left: 8,
    background: 'rgba(0,0,0,.55)',
    border: '1px solid rgba(255,255,255,.35)',
    padding: '6px 10px',
    borderRadius: 12,
    fontSize: 13,
    zIndex: 3,
  },
  hudPerforming: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    background: 'rgba(0,0,0,.55)',
    border: '1px solid rgba(255,255,255,.35)',
    padding: '6px 10px',
    borderRadius: 12,
    fontSize: 13,
    zIndex: 3,
    maxWidth: 260,
  },
  diceOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    zIndex: 3,
  },
  hudListening: {
    position: 'absolute',
    top: 8,
    left: 8,
    background: 'rgba(0,0,0,.55)',
    border: '1px solid rgba(255,255,255,.35)',
    padding: '4px 8px',
    borderRadius: 10,
    fontSize: 11,
    zIndex: 5,
    maxWidth: 260,
    display: 'flex',
    alignItems: 'baseline',
    pointerEvents: 'none'
  },
  // Visual Novel overlay styles
  vnLogo: { position:'absolute', left: 10, top: -32, width: 192, height: 'auto', objectFit: 'contain', opacity: .9, pointerEvents: 'none' },
  vnBustLeft: { position:'absolute', left: 37, bottom: 0, width: 220, height: 'auto', objectFit: 'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.35))', opacity: .95, transform:'translate(25px, 25px)' },
  vnBustRight: { position:'absolute', right: 12, bottom: 10, width: 330, height: 'auto', objectFit: 'contain', filter:'drop-shadow(0 2px 6px rgba(0,0,0,.35))', opacity: .95 },
  vnBubble: { background:'rgba(114, 69, 187, .45)', border:'1px solid rgba(255,255,255,.35)', borderRadius: 12, padding:'10px 12px', color:'#fff', backdropFilter:'blur(2px)', boxShadow:'0 4px 12px rgba(0,0,0,.2)' },
  vnBubbleLeft: { textAlign:'left' },
  vnBubbleRight: { textAlign:'left' },
  diceMiniOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    zIndex: 3,
  },
  diceChip: {
    minWidth: 64,
    height: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.25)',
    background: 'rgba(0,0,0,.35)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 8px',
  },
  diceMiniChip: {
    minWidth: 56,
    height: 38,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.25)',
    background: 'rgba(0,0,0,.35)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 6px',
  },
  diceLabel: { fontWeight: 800, fontSize: 12, opacity: .9 },
  diceVal: { fontWeight: 800, fontSize: 14 },
  nudgeImgBtn: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 36,
    height: 36,
    objectFit: 'contain',
    cursor: 'pointer',
    zIndex: 3,
    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.35))'
  },
  restBtn: {
    height: 44,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,.25)',
    background: 'rgba(0,0,0,.35)',
    color: 'white',
    padding: '0 10px',
    cursor: 'pointer',
  },
  rollBubble: {
    position: 'absolute',
    transform: 'translate(-50%, -115%)',
    background: 'rgba(0,0,0,.8)',
    color: 'white',
    border: '1px solid rgba(255,255,255,.35)',
    borderRadius: 10,
    padding: '6px 8px',
    display: 'flex',
    gap: 6,
    alignItems: 'baseline',
    zIndex: 4,
    pointerEvents: 'none',
    transition: 'transform 160ms ease-out',
  },
  moneyTopRight: {
    position: 'absolute',
    top: 8,
    right: 12,
    background: 'rgba(0,0,0,.55)',
    border: '1px solid rgba(255,255,255,.35)',
    padding: '6px 10px',
    borderRadius: 12,
    fontSize: 14,
    zIndex: 10,
  },
  desktopModal: {
    width: '100%',
    height: '100%',
    maxWidth: '100%',
    maxHeight: '100%',
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  desktopPanel: {
    position: 'absolute',
    inset: 0,
    backgroundImage: "url('/art/desktopbackground.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    zIndex: 3,
  },
  desktopIcons: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    gap: 10,
    padding: 12,
    alignItems: 'flex-start',
  },
  finishBtnSmall: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 36,
    height: 36,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,.35)',
    background: 'rgba(255,255,255,.15)',
    color: 'white',
    fontWeight: 900,
    cursor: 'pointer',
  },
  performCta: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    border: 'none',
    borderRadius: 12,
    padding: '10px 12px',
    background: 'white',
    color: 'black',
    fontWeight: 900,
    fontSize: 14,
    zIndex: 3,
    cursor: 'pointer',
  },
  desktopColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  desktopIconWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  desktopIcon: {
    width: 96,
    height: 96,
    background: 'rgba(255,255,255,.10)',
    border: '1px solid rgba(255,255,255,.20)',
    borderRadius: 10,
    color: 'white',
    fontWeight: 800,
    fontSize: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  desktopIconImg: { width: 80, height: 80, objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,.25))' },
  desktopIconLabel: { fontSize: 12, opacity: 0.95, color: '#7d6187', marginTop: -10, display: 'none' },
  desktopClose: {
    marginLeft: 'auto',
    width: 48,
    height: 48,
    background: 'rgba(255,255,255,.15)',
    border: '1px solid rgba(255,255,255,.25)',
    borderRadius: 10,
    color: 'white',
    fontWeight: 800,
    fontSize: 20,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  titleScreen: {
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    borderRadius: 0,
    border: 'none',
    backgroundImage: "url('/art/newtitlescreen.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    boxShadow: 'none',
    cursor: 'pointer',
  },
  startButton: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    border: 'none',
    borderRadius: 12,
    padding: '12px 18px',
    fontWeight: 900,
    fontSize: 16,
    background: 'white',
    color: 'black',
    cursor: 'pointer',
  },
  startImgButton: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(calc(-50% - 100px)) translateY(30px)',
    width: 286,
    height: 83,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
  continueImgButton: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: 'translateX(calc(-50% + 100px)) translateY(30px)',
    width: 286,
    height: 83,
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
  },
};

// Slightly nicer on wider screens
if (typeof window !== "undefined") {
  const mq = window.matchMedia("(min-width: 860px)");
  if (mq.matches) {
    styles.grid.gridTemplateColumns = "1fr";
  }
}

// Simple Radar Snapshot (Melody/Lyrics/Performance)
function RadarSnapshot({ vocals, writing, stage, practiceT, writeT, performT, totalDays }) {
  const mel = practiceT * (1 + vocals / 12);
  const lyr = writeT * (1 + writing / 12);
  const per = performT * (1 + stage / 12);
  const melMax = totalDays * (1 + vocals / 12);
  const lyrMax = totalDays * (1 + writing / 12);
  const perMax = totalDays * (1 + stage / 12);
  const melFrac = melMax > 0 ? mel / melMax : 0;
  const lyrFrac = lyrMax > 0 ? lyr / lyrMax : 0;
  const perFrac = perMax > 0 ? per / perMax : 0;

  const size = 220; const cx = size/2; const cy = size/2 + 6; const R = 80;
  const toXY = (frac, angleDeg) => {
    const a = (Math.PI/180) * angleDeg;
    const r = Math.max(0, Math.min(1, frac)) * R;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  // Axes: 90? (Melody, up), 210? (Lyrics, down-left), 330? (Performance, down-right)
  const pMel = toXY(melFrac, -90 + 180); // adjust for SVG y downwards
  const pLyr = toXY(lyrFrac, 150);
  const pPer = toXY(perFrac, 30);
  const pMaxMel = toXY(1, 90);
  const pMaxLyr = toXY(1, 210);
  const pMaxPer = toXY(1, 330);
  const poly = `${pMel[0]},${pMel[1]} ${pLyr[0]},${pLyr[1]} ${pPer[0]},${pPer[1]}`;
  const polyMax = `${pMaxMel[0]},${pMaxMel[1]} ${pMaxLyr[0]},${pMaxLyr[1]} ${pMaxPer[0]},${pMaxPer[1]}`;

  return (
    <div style={{ marginTop: 12, display:'flex', justifyContent:'center' }}>
      <svg width={size} height={size}>
        {/* Axes */}
        <line x1={cx} y1={cy} x2={pMaxMel[0]} y2={pMaxMel[1]} stroke="rgba(255,255,255,.25)" />
        <line x1={cx} y1={cy} x2={pMaxLyr[0]} y2={pMaxLyr[1]} stroke="rgba(255,255,255,.25)" />
        <line x1={cx} y1={cy} x2={pMaxPer[0]} y2={pMaxPer[1]} stroke="rgba(255,255,255,.25)" />
        {/* Max triangle */}
        <polygon points={polyMax} fill="none" stroke="rgba(255,255,255,.2)" />
        {/* Current polygon */}
        <polygon points={poly} fill="rgba(255,255,255,.25)" stroke="white" strokeOpacity="0.6" />
        {/* Labels */}
        <text x={cx} y={cy - R - 8} textAnchor="middle" fontSize="11" fill="white">Melody</text>
        <text x={cx - R * 0.9} y={cy + R * 0.75} textAnchor="middle" fontSize="11" fill="white">Lyrics</text>
        <text x={cx + R * 0.9} y={cy + R * 0.75} textAnchor="middle" fontSize="11" fill="white">Performance</text>
      </svg>
    </div>
  );
}

function TriadBarChart({ actions, vocals, writing, stage, totalDays }) {
  const segs = actions.filter(a=>a.t!=='gig');
  const axes = [
    { key: 'Melody', color: '#9AE6B4', stat: vocals, keyProp:'m' },
    { key: 'Lyrics', color: '#63B3ED', stat: writing, keyProp:'l' },
    { key: 'Performance', color: '#F6AD55', stat: stage, keyProp:'p' },
  ].map(a => {
    const value = segs.reduce((sum, s)=> sum + (+s[a.keyProp]||0), 0);
    // Fixed-cap normalization so higher stats fill faster for the same days
    const max = totalDays * (1 + 10 / 8);
    const frac = max > 0 ? value / max : 0;
    const parts = segs.filter(s => (s[a.keyProp]||0) > 0).map(s => ({ w: (s[a.keyProp]/max) }));
    return { ...a, value, max, frac, parts };
  });

  const qualityLabel = (frac) => {
    if (frac >= 0.85) return { label: 'Masterpiece', color: '#EBCB8B' };
    if (frac >= 0.65) return { label: 'Great', color: '#A3BE8C' };
    if (frac >= 0.4) return { label: 'Good', color: '#88C0D0' };
    if (frac >= 0.2) return { label: 'OK', color: '#E5E9F0' };
    return { label: 'Bad', color: '#D08770' };
  };

  return (
    <div style={{ marginTop: 12 }}>
      {axes.map((a) => {
        const q = qualityLabel(a.frac);
        return (
          <div key={a.key} style={styles.barRow}>
            <div style={styles.barLabel}>{a.key}</div>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barBackGrid }} />
              <div style={{ position:'absolute', left:0, top:0, bottom:0, right:0, display:'flex' }}>
                {a.parts.map((p,i)=>(
                  <div key={i} style={{ height:'100%', width: `${Math.max(1, p.w*100)}%`, background: a.color, opacity: 0.95, marginRight: 2, borderRadius: 6 }} />
                ))}
              </div>
            </div>
            <div style={{ ...styles.barRight, color: q.color }}>{q.label}</div>
          </div>
        );
      })}
      <div style={{ ...styles.sub, marginTop: 6 }}>Bars fill faster with higher stats; cap is a fixed weekly goal.</div>
    </div>
  );
}
