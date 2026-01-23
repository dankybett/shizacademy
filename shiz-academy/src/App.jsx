import { useEffect, useMemo, useState } from "react";
const ROOM_HEIGHT = 260;
// Positive moves target down, negative moves up (in pixels, relative to room height)
const FLOOR_TARGET_Y_ADJUST_PX = -20;
// Feature flag: enable dice-based song system
const DICE_MODE = true;
// Optional: show persistent dice chips in room (we'll use animated roll FX instead)
const SHOW_DICE_BAR = false;

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

// Compatibility hints: -1 (risky), 0 (okay), +1 (great)
// Unlisted pairs default to 0
const COMPAT = {
  Pop: {
    Love: 1,
    Heartbreak: 1,
    Party: 1,
    Nostalgia: 0,
    Empowerment: 1,
    Rebellion: 0,
    Melancholy: 0,
    Synthwave: 0,
  },
  Rock: {
    Rebellion: 1,
    Freedom: 1,
    Love: 0,
    Heartbreak: 0,
    Party: 0,
    Empowerment: 1,
    Melancholy: 0,
  },
  EDM: {
    Party: 1,
    Freedom: 0,
    Love: -1,
    Dreams: 0,
    Adventure: 1,
  },
  "Hip-Hop": {
    Rebellion: 1,
    Empowerment: 1,
    Love: 0,
    Heartbreak: 0,
    Party: 1,
    Nostalgia: 0,
  },
  Jazz: {
    Love: 1,
    Melancholy: 1,
    Nostalgia: 1,
    Party: -1,
  },
  Country: {
    Heartbreak: 1,
    Love: 1,
    Adventure: 1,
    Party: -1,
  },
  "R&B": {
    Love: 1,
    Heartbreak: 1,
    Dreams: 1,
    Rebellion: -1,
  },
  Metal: {
    Rebellion: 1,
    Freedom: 1,
    Melancholy: 0,
    Love: -1,
  },
  Folk: {
    Nostalgia: 1,
    Adventure: 1,
    Dreams: 1,
    Party: -1,
  },
  Synthwave: {
    Nostalgia: 1,
    Dreams: 1,
    Party: 1,
    Melancholy: 0,
  },
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function gradeFromScore(score) {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pair bonus algorithm constants
const COMPAT_BONUS_GOOD = 8;
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

function computeChartPosition(score, fans) {
  const base = 120 - score; // higher score -> better (lower) position
  const fanBoost = Math.min(40, Math.floor(Math.log10((fans || 0) + 10) * 14));
  const noise = randInt(-3, 3);
  const raw = Math.round(base - fanBoost + noise);
  return clamp(raw, 1, 100);
}

function buildFeedback({ vocals, writing, stage, practiceT, writeT, performT, compat, genre, theme, songHistory, score }) {
  const tips = [];
  // Compatibility advice
  if (compat < 0) {
    tips.push("Genre/theme pairing is risky — try a different combo.");
  } else if (compat === 0 && score < 80) {
    tips.push("Consider a stronger genre/theme match for higher potential.");
  }
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
      tips.push("Too similar to last release — try varying genre or theme.");
    }
  }
  return tips;
}

const REVIEW_LINES = {
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
    icon: "🧢",
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
    icon: "🍺",
    cost: 20,
    breakEven: 60,
    payoutPerPoint: 1.3,
    fanMult: 1.1,
    rng: 2,
    desc: "Lively hall. Profitable with solid songs.",
  },
  stadium: {
    name: "Stadium",
    icon: "🏟",
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

  // Time allocation via instructions (7 days per week)
  const TOTAL_TIME = 7;
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
  const [progressOpen, setProgressOpen] = useState(false);
  const [roomWidth, setRoomWidth] = useState(520);
  const [walkablePts, setWalkablePts] = useState([]);
  const [facingLeft, setFacingLeft] = useState(false);
  const [isPerforming, setIsPerforming] = useState(false);
  const [performingVenue, setPerformingVenue] = useState(null);
  const [socialOpen, setSocialOpen] = useState(false);
  const [myMusicOpen, setMyMusicOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Dice mode state (per week)
  const [rollBest, setRollBest] = useState({ sing: null, write: null, perform: null });
  const [rollHistory, setRollHistory] = useState([]); // {day, action, value, faces}
  const [prevFaces, setPrevFaces] = useState({ sing: facesFor(0), write: facesFor(0), perform: facesFor(0) });
  const [toasts, setToasts] = useState([]); // {id, text}
  const [rollFx, setRollFx] = useState({ show:false, faces:0, current:null, final:null, settled:false });

  function facesFor(stat) {
    if (stat >= 9.5) return 6;
    if (stat >= 9) return 8;
    if (stat >= 7) return 10;
    if (stat >= 5) return 12;
    return 20;
  }
  function rollDie(faces) {
    return Math.max(1, Math.floor(Math.random() * faces) + 1);
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

  const remaining = useMemo(() => TOTAL_TIME - actions.length, [actions]);

  // Track training gains within the current week (for UI + undo/clear)
  const [weekVocGain, setWeekVocGain] = useState(0);
  const [weekWriGain, setWeekWriGain] = useState(0);
  const [weekStageGain, setWeekStageGain] = useState(0);

  function diminishFactor(nth) {
    // Smooth diminishing: 0.85^(n-1), floor to 0.3 minimum effectiveness
    return Math.max(0.3, Math.pow(0.85, Math.max(0, nth - 1)));
  }

  const canRelease = remaining === 0 && week <= MAX_WEEKS;

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
    const tiers = [ { t:5, f:12 }, { t:7, f:10 }, { t:9, f:8 }, { t:9.5, f:6 } ];
    for (let i=0;i<tiers.length;i++) {
      if (stat < tiers[i].t) return tiers[i];
    }
    return null;
  }

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
      changes.forEach(c=> pushToast(`${c.label} die upgraded: d${c.from} → d${c.to}`));
      pushToast('Train with actions and gigs to improve dice');
      setPrevFaces(curr);
    }
  }, [vocals, writing, stage]);

  // Animated roll FX: flicker numbers above the performer
  useEffect(()=>{
    if (!rollFx.show) return;
    let tick = setInterval(()=>{
      setRollFx(prev=> ({ ...prev, current: 1 + Math.floor(Math.random() * (prev.faces||20)) }));
    }, 70);
    let settle = setTimeout(()=>{
      // Stop flicker and show final value with pop
      clearInterval(tick);
      setRollFx(prev=> ({ ...prev, current: prev.final, settled: true }));
    }, 900);
    // Hold the final number visibly for longer (~1.6s after settle)
    let hide = setTimeout(()=>{
      setRollFx({ show:false, faces:0, current:null, final:null, settled:false });
    }, 2500);
    return ()=> { clearInterval(tick); clearTimeout(settle); clearTimeout(hide); };
  }, [rollFx.show]);

  function stationTarget(type) {
    // Base positions match station 'left'/'top' percentages; apply pixel offsets to stay aligned
    if (type === 'write') {
      const x = percentWithOffset(15, 215, roomWidth);
      const y = percentWithOffset(65, 10, ROOM_HEIGHT);
      return { x, y };
    }
    if (type === 'practice') {
      const x = percentWithOffset(45, -30, roomWidth);
      const y = percentWithOffset(60, 30, ROOM_HEIGHT);
      return { x, y };
    }
    // perform → mirror
    const x = percentWithOffset(80, 10, roomWidth);
    const y = percentWithOffset(65, 50, ROOM_HEIGHT);
    return { x, y };
  }

  function instruct(type) {
    if (!conceptLocked || remaining <= 0 || finishedReady) return;
    const base = 0.15;
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
      if (Array.isArray(s.songHistory)) setSongHistory(s.songHistory);
      if (typeof s.finishedReady === "boolean") setFinishedReady(s.finishedReady);
      if (s.rollBest) setRollBest(s.rollBest);
      if (Array.isArray(s.rollHistory)) setRollHistory(s.rollHistory);
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
      if (s.lastResult && typeof s.lastResult === "object") setLastResult(s.lastResult);
    } catch (_) {
      // ignore corrupted saves
    }
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
      ts: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch (_) {
      // quota/full - ignore for now
    }
  }, [week, money, fans, vocals, writing, stage, genre, theme, songName, conceptLocked, started, finishedReady, songHistory, actions, practiceT, writeT, performT, rollBest, rollHistory, weekVocGain, weekWriGain, weekStageGain, lastResult]);

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
      // Weight roughly equal; scale to 100
      triadBase = (0.34 * s + 0.33 * w + 0.33 * p) * 100;
    } else {
      // Sum triad contributions from recorded actions (exclude gigs)
      const triadSum = actions.reduce((acc, a) => a.t === 'gig' ? acc : acc + (a.m||0) + (a.l||0) + (a.p||0), 0);
      triadBase = triadSum * 5; // retuned lower early power
      // Early-week dampener (weeks 1–6): gradually scales up to full power
      const earlyFactor = Math.min(1, 0.75 + (week - 1) * 0.05);
      triadBase *= earlyFactor;
    }

    const variance = randInt(-5, 5) + randInt(-venue.rng, venue.rng);
    const pairBonus = computePairBonus(genre, theme, true);
    const score = clamp(triadBase + pairBonus + variance, 0, 100);
    const grade = gradeFromScore(score);

    // Fans: base by grade, scaled by venue
    const fansGainByGrade = { S: 60, A: 40, B: 25, C: 12, D: 5 };

    // Small scaling with existing fans so growth feels good
    const fanBonus = Math.floor(fans * 0.05); // +5% of current fans
    let fansGain = Math.round((fansGainByGrade[grade] + fanBonus) * (venue.fanMult ?? 1));

    // Money: venue economics
    const margin = score - (venue.breakEven ?? 0);
    let gross = Math.max(0, margin) * (venue.payoutPerPoint ?? 0);
    let net = Math.floor(gross - (venue.cost ?? 0));
    // Busking never loses money; small tip floor
    if (venueKey === 'busking') net = Math.max(venue.tipFloor ?? 5, net);
    // Early guardrail: weeks 1–3, cap losses
    if (week <= 3) net = Math.max(net, -20);

    const moneyGain = net;

    // Optional twist: busking grants small stage boost
    if (venueKey === 'busking') {
      setStage((v) => clamp(v + 0.2, 0, 10));
    }

    setMoney((m) => m + moneyGain);
    setFans((f) => f + fansGain);

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
      fansGain,
      feedback,
    };
    setLastResult(entry);
    setSongHistory((arr) => [entry, ...arr]);

    setWeek((w) => w + 1);
    resetWeekProgress();
    setConceptLocked(false);
    setSongName("");
    setStatus("Song released! Checking reviews...");
    setVenueOpen(false);
    setPerformingVenue(venueKey);
    setIsPerforming(true);
    setActivity('idle');
    setStatus(`Performing at ${venue.name}...`);
    setFinishedReady(false);
    setTimeout(() => {
      setIsPerforming(false);
      setReleaseOpen(true);
      setActivity('idle');
    }, 5000);
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
            if (act === "write") {
              setActivity("write");
              setStatus("Writing a catchy hook...");
              if (DICE_MODE) {
                const faces = facesFor(writing);
                const value = rollDie(faces);
                setRollBest((r) => ({ ...r, write: { value, faces } }));
                setRollHistory((h) => [...h, { day: TOTAL_TIME - remaining + 1, action: 'write', value, faces }]);
                setRollFx({ show:true, faces, current:null, final:value, settled:false });
              }
            } else if (act === "practice") {
              setActivity("singing");
              setStatus("Practicing vocal runs...");
              if (DICE_MODE) {
                const faces = facesFor(vocals);
                const value = rollDie(faces);
                setRollBest((r) => ({ ...r, sing: { value, faces } }));
                setRollHistory((h) => [...h, { day: TOTAL_TIME - remaining + 1, action: 'sing', value, faces }]);
                setRollFx({ show:true, faces, current:null, final:value, settled:false });
              }
            } else if (act === "perform") {
              setActivity("dancing");
              setStatus("Rehearsing stage moves...");
              if (DICE_MODE) {
                const faces = facesFor(stage);
                const value = rollDie(faces);
                setRollBest((r) => ({ ...r, perform: { value, faces } }));
                setRollHistory((h) => [...h, { day: TOTAL_TIME - remaining + 1, action: 'perform', value, faces }]);
                setRollFx({ show:true, faces, current:null, final:value, settled:false });
              }
            }
            const dur = act === 'practice' ? 5000 : act === 'perform' ? 5000 : 1200;
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
        const stride = Math.max(4, Math.floor(Math.min(cw, ch) / 80));
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
    img.src = '/art/apartmentfloor-mask.png';
  }, []);

  const isOver = week > MAX_WEEKS;

  const bestChart = useMemo(() => {
    if (!songHistory || songHistory.length === 0) return null;
    return Math.min(...songHistory.map((s) => (s.chartPos ?? 100)));
  }, [songHistory]);

  const bestGrade = useMemo(() => {
    if (!songHistory || songHistory.length === 0) return null;
    const order = { S: 5, A: 4, B: 3, C: 2, D: 1 };
    return songHistory.reduce((best, s) => (order[s.grade] > (order[best] ?? 0) ? s.grade : best), 'D');
  }, [songHistory]);

  const weeklyGigs = useMemo(() => (actions || []).filter((a) => a.t === 'gig').length, [actions]);

  // Title screen before starting
  if (!started) {
    return (
      <div style={styles.page}>
        <div style={styles.titleScreen} onClick={() => setStarted(true)} title="Tap to start" />
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
        <div style={styles.headerRow}>
          <div>
            <div style={styles.title}>Performer Jam</div>
            <div style={styles.sub}>
              Week {Math.min(week, MAX_WEEKS)} / {MAX_WEEKS}
            </div>
          </div>
          <button onClick={restart} style={styles.secondaryBtn}>Restart</button>
          <button onClick={() => setMenuOpen(true)} style={styles.secondaryBtn}>Menu</button>
        </div>

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
                    placeholder="Type a song name..."
                    style={styles.input}
                  />
                  <button
                    style={styles.smallBtn}
                    onClick={() => setSongName(randomSongName(genre, theme))}
                  >Random</button>
                </div>

                <div style={{ ...styles.sub, marginTop: 8 }}>
                  Compatibility: <b>{compat === 1 ? "Great" : compat === 0 ? "Okay" : "Risky"}</b>
                </div>

                <button
                  onClick={() => setConceptLocked(true)}
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
              <div style={{ ...styles.room, width: roomWidth, backgroundImage: isPerforming && performingVenue ? `url('${VENUE_BG[performingVenue]}')` : "url('/art/apartmentbackground.png')" }}>
              {/* Room HUD removed per request (Week/Remaining moved to Calendar) */}
              <div style={styles.hudMoney}>💷 {money}</div>
              {DICE_MODE && (
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
              <div
                style={{ ...styles.station, left: "10%", top: "28%", cursor: 'pointer', transform: 'translate(-50%, -50%) translate(280px, 55px)' }}
                onClick={() => setFinanceOpen(true)}
                title="Computer"
              >
                <img src="/art/computer.png" alt="Computer" style={styles.computerImg} />
              </div>
                {!isPerforming && (
                  <>
                    <div style={{ ...styles.station, left: "15%", top: "65%", transform: 'translate(-50%, -50%) translate(215px, 10px)' }} title="Writing desk">
                      <img src="/art/chair.png" alt="Writing desk" style={styles.chairImg} />
                    </div>
                    <div style={{ ...styles.station, left: "45%", top: "60%", transform: 'translate(-50%, -50%) translate(-30px, 0px)' }} title="Mic">
                      <img src="/art/microphone.png" alt="Microphone" style={styles.stationImg} />
                    </div>
                    <div style={{ ...styles.station, left: "80%", top: "65%", transform: 'translate(-50%, -50%) translate(40px, 20px)' }} title="Mirror">
                      <img src="/art/mirror.png" alt="Mirror" style={styles.stationImg} />
                    </div>
                  </>
                )}

                <div
                  style={{
                    ...styles.performer,
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) scaleX(${activity === 'walk' && facingLeft ? -1 : 1}) scale(${activity === 'walk' ? 2.3 : activity === 'singing' ? 1.06 : 1})${activity === 'dancing' ? ' rotate(2deg)' : ''}`,
                  }}
                  onClick={() => setStatsOpen(true)}
                  title="Your performer"
                >
                  {activity === 'walk' && !isPerforming ? (
                    <img src="/art/walking.gif" alt="Performer walking" style={styles.performerImg} />
                  ) : activity === 'singing' && !isPerforming ? (
                    <img src="/art/singing.gif" alt="Performer singing" style={styles.performerImg} />
                  ) : activity === 'dancing' && !isPerforming ? (
                    <img src="/art/dancing.gif" alt="Performer dancing" style={styles.performerImg} />
                  ) : (
                    <img src="/art/idle.gif" alt="Performer idle" style={styles.performerImg} />
                  )}
                  {activity === "write" && <div style={styles.actionEmoji}>✍️</div>}
                  {activity === "sing" && <div style={styles.actionEmoji}>🎶</div>}
                  {activity === "dance" && <div style={styles.actionEmoji}>💃</div>}
                </div>
                {DICE_MODE && rollFx.show && (
                  <div style={{
                    ...styles.rollBubble,
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    background: bubbleBg(rollFx.current, rollFx.faces),
                    transform: `translate(-50%, -115%) translateY(-35px) scale(${rollFx.settled?1.12:1})`
                  }}>
                    <div style={{ fontWeight:800 }}>{rollFx.current ?? ''}</div>
                    <div style={{ fontSize:11, opacity:.85 }}>d{rollFx.faces}</div>
                  </div>
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
                {!isPerforming && !financeOpen && (
                  <div style={styles.buttonsOverlay}>
                    <button disabled={!conceptLocked || remaining<=0} onClick={() => instruct("practice")} style={styles.actionBtn}>
                      <img src="/art/singbutton.png" alt="Sing" style={styles.actionImg} />
                    </button>
                    <button disabled={!conceptLocked || remaining<=0} onClick={() => instruct("write")} style={styles.actionBtn}>
                      <img src="/art/writebutton.png" alt="Write" style={styles.actionImg} />
                    </button>
                    <button disabled={!conceptLocked || remaining<=0} onClick={() => instruct("perform")} style={styles.actionBtn}>
                      <img src="/art/dancebutton.png" alt="Perform" style={styles.actionImg} />
                    </button>
                  </div>
                )}

                {financeOpen && (
                  <div style={styles.desktopPanel}>
                    <div style={styles.desktopIcons}>
                    <button style={styles.desktopIcon} title="Social" onClick={() => setSocialOpen(true)}>S</button>
                    <button style={styles.desktopIcon} title="My Music" onClick={() => setMyMusicOpen(true)}>M</button>
                    <button style={styles.desktopIcon} title="Calendar" onClick={() => setCalendarOpen(true)}>C</button>
                    <button style={styles.desktopClose} onClick={() => setFinanceOpen(false)}>✕</button>
                  </div>
                </div>
              )}
              </div>
            </div>

            {/* Book Gig moved into the computer modal */}
            {/* Gigs count removed per request */}

            <div style={styles.weekStrip}>
              {Array.from({ length: TOTAL_TIME }).map((_, i) => {
                const a = actions[i];
                const t = a?.t;
                const icon = t === "practice" ? "🎤" : t === "write" ? "✍️" : t === "perform" ? "🎶" : t === "gig" ? "🎫" : "";
                return (
                  <div key={i} style={styles.dayCell} title={t ? t : "Unused day"}>
                    <div style={styles.dayLabel}>{DAYS[i]}</div>
                    <div style={t ? styles.dayIconOn : styles.dayIconOff}>{icon || ""}</div>
                  </div>
                );
              })}
            </div>

            {canRelease && !finishedReady && (
              <button
                onClick={finishSong}
                style={{ ...styles.primaryBtn, marginTop: 10 }}
              >
                Finish song
              </button>
            )}
            {finishedReady && (
              <>
                <div style={{ ...styles.sub, marginTop: 8 }}>Song finished — ready to perform.</div>
                <button
                  onClick={() => setVenueOpen(true)}
                  style={{ ...styles.primaryBtn, marginTop: 8 }}
                >
                  Choose venue & perform
                </button>
              </>
            )}
          </section>
        </div>

        {/* Streamlined: hide the persistent last result section */}

        {isOver && (
          <div style={styles.overlay}>
            <div style={{ ...styles.modal, maxWidth: 460 }}>
              <div style={styles.title}>Year Summary</div>
              <div style={{ marginTop: 8 }}>
                <div style={styles.statRow}><span>Songs Released</span><b>{songHistory.length}</b></div>
                <div style={styles.statRow}><span>Best Chart</span><b>{bestChart != null ? `#${bestChart}` : '—'}</b></div>
                <div style={styles.statRow}><span>Best Grade</span><b>{bestGrade ?? '—'}</b></div>
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

        {progressOpen && (
          <div style={styles.overlay} onClick={() => setProgressOpen(false)}>
            <div style={{ ...styles.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Current Song Progress</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>
                {conceptLocked && songName ? (<span>Working on: <b>{songName}</b></span>) : (<span>No active song yet.</span>)}
              </div>
              <TriadBarChart
                actions={actions}
                vocals={vocals}
                writing={writing}
                stage={stage}
                totalDays={TOTAL_TIME}
              />
              <button onClick={() => setProgressOpen(false)} style={{ ...styles.primaryBtn, marginTop: 14 }}>
                Close
              </button>
            </div>
          </div>
        )}

        {menuOpen && !isOver && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.title}>Menu</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>
                Week {week} • Money {money} • Fans {fans}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <button onClick={() => setMenuOpen(false)} style={styles.primaryBtn}>Resume</button>
                <button onClick={saveNow} style={styles.secondaryBtn}>Save now</button>
                <button onClick={() => { clearSave(); setMenuOpen(false); }} style={styles.secondaryBtn}>Clear save</button>
                <button onClick={() => { restart(); setMenuOpen(false); }} style={styles.secondaryBtn}>Restart run</button>
              </div>
              <div style={{ ...styles.sub, marginTop: 10 }}>Autosave: On</div>
            </div>
          </div>
        )}

        {showWelcome && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.title}>Welcome</div>
              <div style={{ ...styles.sub, marginTop: 8 }}>
                Each week you have 10 actions. Instruct your performer to Practice, Write, or Perform. Actions train stats with diminishing returns. When all 10 are used, release your song.
              </div>
              <button onClick={() => { setShowWelcome(false); setShowConcept(true); }} style={{ ...styles.primaryBtn, marginTop: 14 }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {showConcept && !conceptLocked && (
          <div style={styles.overlay}>
            <div style={styles.modal}>
              <div style={styles.title}>Week {week}: Define Your Song</div>
              <div style={{ ...styles.label, marginTop: 10 }}>Genre</div>
              <div style={styles.rowWrap}>
                {GENRES.map((g) => (
                  <button key={g} onClick={() => setGenre(g)} style={g === genre ? styles.btnOn : styles.btnOff}>{g}</button>
                ))}
              </div>

              <div style={styles.label}>Theme</div>
              <div style={styles.rowWrap}>
                {THEMES.map((t) => (
                  <button key={t} onClick={() => setTheme(t)} style={t === theme ? styles.btnOn : styles.btnOff}>{t}</button>
                ))}
              </div>

              <div style={{ ...styles.label, marginTop: 8 }}>Song name</div>
              <div style={styles.inlineRow}>
                <input value={songName} onChange={(e) => setSongName(e.target.value)} placeholder="Type a song name..." style={styles.input} />
                <button style={styles.smallBtn} onClick={() => setSongName(randomSongName(genre, theme))}>Random</button>
              </div>
              <div style={{ ...styles.sub, marginTop: 8 }}>
                Compatibility: <b>{compat === 1 ? "Great" : compat === 0 ? "Okay" : "Risky"}</b>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setShowConcept(false)} style={styles.secondaryBtn}>Cancel</button>
                <button onClick={() => { setConceptLocked(true); setShowConcept(false); }} disabled={!songName.trim()} style={!songName.trim() ? styles.primaryBtnDisabled : styles.primaryBtn}>Begin week</button>
              </div>
            </div>
          </div>
        )}

        {statsOpen && (
          <div style={styles.overlay} onClick={() => setStatsOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Performer Stats</div>
              <div style={{ marginTop: 8 }}>
                <div style={styles.progressLabel}><span>Vocals</span><span>{vocals.toFixed(2)} / 10</span></div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${Math.min(100, Math.max(0, (vocals/10)*100))}%`, background: '#9AE6B4' }} />
                </div>
                <div style={styles.progressHelp}>Affects singing quality in the final song score; trained by Practice and gigs.</div>
                {DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(vocals)}{nextDieInfo(vocals) ? ` • Next: d${nextDieInfo(vocals).f} at ≥ ${nextDieInfo(vocals).t.toFixed(1)}` : ' • Max die unlocked'}
                  </div>
                )}

                <div style={styles.progressLabel}><span>Writing</span><span>{writing.toFixed(2)} / 10</span></div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${Math.min(100, Math.max(0, (writing/10)*100))}%`, background: '#63B3ED' }} />
                </div>
                <div style={styles.progressHelp}>Improves composition quality; pairs with Write days for higher song scores.</div>
                {DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(writing)}{nextDieInfo(writing) ? ` • Next: d${nextDieInfo(writing).f} at ≥ ${nextDieInfo(writing).t.toFixed(1)}` : ' • Max die unlocked'}
                  </div>
                )}

                <div style={styles.progressLabel}><span>Stage</span><span>{stage.toFixed(2)} / 10</span></div>
                <div style={styles.progressTrack}>
                  <div style={{ ...styles.progressFill, width: `${Math.min(100, Math.max(0, (stage/10)*100))}%`, background: '#F6AD55' }} />
                </div>
                <div style={styles.progressHelp}>Boosts performance presence; pairs with Perform days and gigs for impact.</div>
                {DICE_MODE && (
                  <div style={styles.progressHelp}>
                    Current die: d{facesFor(stage)}{nextDieInfo(stage) ? ` • Next: d${nextDieInfo(stage).f} at ≥ ${nextDieInfo(stage).t.toFixed(1)}` : ' • Max die unlocked'}
                  </div>
                )}
              </div>
              <button onClick={() => setStatsOpen(false)} style={{ ...styles.primaryBtn, marginTop: 14 }}>
                Close
              </button>
            </div>
          </div>
        )}

        {false && financeOpen}

        {socialOpen && (
          <div style={styles.overlay} onClick={() => setSocialOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Social</div>
              <div style={{ marginTop: 8 }}>
                <div style={styles.statRow}><span>⭐ Fans</span><b>{fans}</b></div>
              </div>
              <button onClick={() => setSocialOpen(false)} style={{ ...styles.primaryBtn, marginTop: 14 }}>Close</button>
            </div>
          </div>
        )}

        {myMusicOpen && (
          <div style={styles.overlay} onClick={() => setMyMusicOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>My Music</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop: 10 }}>
                <button
                  onClick={() => {
                    setMyMusicOpen(false);
                    if (!conceptLocked) setShowConcept(true); else setProgressOpen(true);
                  }}
                  style={styles.primaryBtn}
                >
                  {conceptLocked ? 'Current Song' : 'Create Song'}
                </button>
                <button onClick={() => { setMyMusicOpen(false); setHistoryOpen(true); }} style={styles.secondaryBtn}>My Song History</button>
                <button
                  disabled={remaining<=0 || weeklyGigs >= MAX_GIGS_PER_WEEK}
                  onClick={() => { setMyMusicOpen(false); setGigOpen(true); setSelectedGigSong(null); }}
                  style={styles.secondaryBtn}
                >
                  Book Gig
                </button>
              </div>
              {DICE_MODE && (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.label}>This Week's Rolls</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:6 }}>
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
                  </div>
                  <div style={{ display:'flex', gap:8, marginTop:8 }}>
                    <button disabled={!conceptLocked || remaining<=0} style={styles.secondaryBtn}
                      onClick={() => { setMyMusicOpen(false); setFinanceOpen(false); instruct('practice'); }}>Reroll Sing</button>
                    <button disabled={!conceptLocked || remaining<=0} style={styles.secondaryBtn}
                      onClick={() => { setMyMusicOpen(false); setFinanceOpen(false); instruct('write'); }}>Reroll Write</button>
                    <button disabled={!conceptLocked || remaining<=0} style={styles.secondaryBtn}
                      onClick={() => { setMyMusicOpen(false); setFinanceOpen(false); instruct('perform'); }}>Reroll Perform</button>
                  </div>
                  <div style={{ ...styles.sub, marginTop:6 }}>Lower rolls are better; better dice reduce worst-case.</div>
                </div>
              )}
              <button onClick={() => setMyMusicOpen(false)} style={{ ...styles.primaryBtn, marginTop: 14 }}>Close</button>
            </div>
          </div>
        )}

        {calendarOpen && (
          <div style={styles.overlay} onClick={() => setCalendarOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Calendar</div>
              <div style={{ marginTop: 8 }}>
                <div style={styles.statRow}><span>Week</span><b>{Math.min(week, MAX_WEEKS)} / {MAX_WEEKS}</b></div>
                <div style={styles.statRow}><span>Day</span><b>{Math.min(TOTAL_TIME - remaining, TOTAL_TIME)} / {TOTAL_TIME}</b></div>
              </div>
              <button onClick={() => setCalendarOpen(false)} style={{ ...styles.primaryBtn, marginTop: 14 }}>Close</button>
            </div>
          </div>
        )}

        {releaseOpen && lastResult && (
          <div style={styles.overlay} onClick={() => setReleaseOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Release Results</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ ...styles.sub, marginBottom: 6 }}>
                  🎵 <b>{lastResult.songName}</b> — {lastResult.genre} / {lastResult.theme}
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
                  +{lastResult.moneyGain} money • +{lastResult.fansGain} fans
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
              </div>
              <button onClick={() => setReleaseOpen(false)} style={{ ...styles.primaryBtn, marginTop: 14 }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {venueOpen && (
          <div style={styles.overlay} onClick={() => setVenueOpen(false)}>
            <div style={{ ...styles.modal, maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Choose Venue</div>
              <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                {Object.entries(VENUES).map(([key, v]) => {
                  // Simple textual forecast
                  let expected = 0;
                  if (DICE_MODE) {
                    const s = rollBest.sing ? ((rollBest.sing.faces + 1 - rollBest.sing.value) / rollBest.sing.faces) : 0;
                    const w = rollBest.write ? ((rollBest.write.faces + 1 - rollBest.write.value) / rollBest.write.faces) : 0;
                    const p = rollBest.perform ? ((rollBest.perform.faces + 1 - rollBest.perform.value) / rollBest.perform.faces) : 0;
                    expected = Math.round(clamp((0.34*s+0.33*w+0.33*p)*100 + computePairBonus(genre, theme, false), 0, 100));
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
                  const reqText = VENUE_FAN_REQ[key] ? `Requires ${VENUE_FAN_REQ[key]} fans` : null;
                  return (
                    <div key={key} style={{ border: '1px solid rgba(255,255,255,.2)', borderRadius: 12, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 700 }}>
                          {v.icon} {v.name}
                        </div>
                        <div style={{ ...styles.sub }}>
                          Cost: {v.cost}
                        </div>
                      </div>
                      <div style={{ ...styles.sub, marginTop: 6 }}>{v.desc}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6, fontSize: 12, opacity: .9 }}>
                        <div>Turnout: <b>{turnout}</b></div>
                        <div>Risk: <b>{risk}</b></div>
                        <div>Fans: <b>{fansPot}</b></div>
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
        )}

        {gigOpen && (
          <div style={styles.overlay} onClick={() => setGigOpen(false)}>
            <div style={{ ...styles.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>Book Gig</div>
              <div style={{ ...styles.sub, marginTop: 6 }}>Play an older song to earn money/fans. Uses 1 day (max 3 gigs per week).</div>
              <div style={{ marginTop: 8, maxHeight: 240, overflowY: 'auto', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, padding: 6 }}>
                {songHistory.length === 0 ? (
                  <div style={styles.sub}>No past songs yet.</div>
                ) : (
                  songHistory.map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{s.songName}</div>
                        <div style={{ ...styles.sub }}>Grade {s.grade} • #{s.chartPos}</div>
                      </div>
                      <button style={styles.smallBtn} onClick={() => setSelectedGigSong(s)}>Select</button>
                    </div>
                  ))
                )}
              </div>
              {selectedGigSong && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ ...styles.sub, marginBottom: 6 }}>Selected: <b>{selectedGigSong.songName}</b> • Fixed score {selectedGigSong.score} • Gigs this week: {weeklyGigs}/{MAX_GIGS_PER_WEEK}</div>
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
                            <div style={{ fontWeight: 700 }}>{v.icon} {v.name}</div>
                            <div style={{ ...styles.sub }}>Cost: {v.cost}</div>
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
                            disabled={locked || capReached}
                            onClick={() => {
                              // Consume a day and apply venue economics using fixed score
                              if (remaining <= 0 || weeklyGigs >= MAX_GIGS_PER_WEEK) return;
                              const vCfg = VENUES[key] ?? VENUES.busking;
                              const score = selectedGigSong.score;
                              const grade = selectedGigSong.grade;
                              const fansGainByGrade = { S: 60, A: 40, B: 25, C: 12, D: 5 };
                              const fanBonus = Math.floor(fans * 0.05);
                              // Freshness and repetition modifiers
                              const weeksSinceRelease = Math.max(0, week - (selectedGigSong.releaseWeek || week));
                              const freshness = Math.max(0.5, 1 - 0.1 * weeksSinceRelease);
                              const repsThisWeek = (selectedGigSong.gigs || []).filter(g => g.week === week).length;
                              const repFactor = repsThisWeek === 0 ? 1.0 : repsThisWeek === 1 ? 0.8 : repsThisWeek === 2 ? 0.6 : 0.5;
                              const weeklyGigs = (actions || []).filter(a => a.t === 'gig').length;
                              const softCap = weeklyGigs >= 3 ? 0.5 : 1.0;
                              let fansGainLocal = Math.round((fansGainByGrade[grade] + fanBonus) * (vCfg.fanMult ?? 1) * freshness * repFactor * softCap);
                              const marginLocal = score - (vCfg.breakEven ?? 0);
                              let gross = Math.max(0, marginLocal) * (vCfg.payoutPerPoint ?? 0) * freshness * repFactor * softCap;
                              let net = Math.floor(gross - (vCfg.cost ?? 0));
                              if (key === 'busking') net = Math.max(vCfg.tipFloor ?? 5, net);
                              if (week <= 3) net = Math.max(net, -20);
                              setMoney((m) => m + net);
                              setFans((f) => f + fansGainLocal);
                              // Training gains from gigs (DR per gig this week)
                              const nthGig = weeklyGigs + 1;
                              const dr = Math.max(0.3, Math.pow(0.85, Math.max(0, nthGig - 1)));
                              const boost = key === 'busking' ? 1.3 : 1.0;
                              setStage((v) => clamp(v + 0.06 * dr * boost, 0, 10));
                              setVocals((v) => clamp(v + 0.03 * dr * boost, 0, 10));
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
                              // Consume a day as a gig action
                              setActions((arr) => [...arr, { t: 'gig', m:0, l:0, p:0 }]);
                              setGigOpen(false);
                            }}
                            style={{ ...(locked ? styles.primaryBtnDisabled : styles.primaryBtn), marginTop: 8 }}
                          >
                            Play here
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
        )}

        {historyOpen && (
          <div style={styles.overlay} onClick={() => setHistoryOpen(false)}>
            <div style={{ ...styles.modal, maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.title}>My Song History</div>
              <div style={{ marginTop: 8, maxHeight: 360, overflowY: 'auto' }}>
                {songHistory.length === 0 ? (
                  <div style={styles.sub}>No releases yet.</div>
                ) : (
                  songHistory.map((s, idx) => (
                    <div key={idx} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span>
                          <b>{s.songName}</b>
                          <span style={{ opacity: .7 }}> • #{s.chartPos}</span>
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
                                <span>Week {g.week} • {g.venue}</span>
                                <span>+{g.moneyGain} • +{g.fansGain} fans</span>
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
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => setHistoryOpen(false)} style={styles.primaryBtn}>Close</button>
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
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    padding: 16,
    background: "#0b0f19",
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 840,
    background: "#121a2b",
    borderRadius: 16,
    padding: 16,
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
    marginTop: 12,
  },
  roomOuter: { display: "flex", justifyContent: "center", marginTop: 8, marginBottom: 6 },
  section: {
    background: "#0f1524",
    borderRadius: 14,
    padding: 12,
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
    height: ROOM_HEIGHT,
    borderRadius: 12,
    backgroundImage: "url('/art/apartmentbackground.png')",
    backgroundSize: "contain",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    border: "1px solid rgba(255,255,255,.15)",
    boxShadow: "inset 0 -20px 30px rgba(0,0,0,.3)",
    overflow: "hidden",
    marginBottom: 8,
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
    width: 72,
    height: 72,
    objectFit: 'contain',
    pointerEvents: 'none',
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
    width: 96,
    height: 96,
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
  },
  secondaryBtn: {
    background: "transparent",
    color: "white",
    border: "1px solid rgba(255,255,255,.25)",
    borderRadius: 12,
    padding: "8px 10px",
    fontWeight: 700,
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
    background: "rgba(0,0,0,.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 16,
    zIndex: 1000,
  },
  modal: {
    width: "100%",
    maxWidth: 360,
    background: "#0f1524",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,.4)",
  },
  ul: { margin: '6px 0 0 18px', padding: 0 },
  li: { fontSize: 13, lineHeight: 1.4, opacity: 0.95 },
  progressLabel: { display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.9, marginTop: 8 },
  progressTrack: { height: 10, borderRadius: 6, background: 'rgba(255,255,255,.12)', overflow: 'hidden', marginTop: 4 },
  progressFill: { height: '100%', background: 'white' },
  progressHelp: { fontSize: 11, opacity: 0.8, marginTop: 4 },
  barRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  barLabel: { width: 90, fontSize: 12 },
  barTrack: { position:'relative', flex: 1, height: 14, borderRadius: 8, background: 'rgba(255,255,255,.08)', overflow: 'hidden' },
  barBackGrid: { position:'absolute', inset:0, background: 'linear-gradient(90deg, rgba(255,255,255,.08) 0 20%, transparent 20% 40%, rgba(255,255,255,.08) 40% 60%, transparent 60% 80%, rgba(255,255,255,.08) 80% 100%)' },
  barRight: { width: 96, textAlign: 'right', fontSize: 12 },
  buttonsOverlay: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%) translateY(25px)',
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
  diceOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    zIndex: 3,
  },
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
  desktopIcon: {
    width: 64,
    height: 64,
    background: 'rgba(255,255,255,.15)',
    border: '1px solid rgba(255,255,255,.25)',
    borderRadius: 10,
    color: 'white',
    fontWeight: 800,
    fontSize: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
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
    maxWidth: 720,
    height: 400,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,.15)',
    backgroundImage: "url('/art/titlescreen.png')",
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    boxShadow: '0 10px 30px rgba(0,0,0,.35)',
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
  // Axes: 90° (Melody, up), 210° (Lyrics, down-left), 330° (Performance, down-right)
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
const ROOM_HEIGHT = 260;
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
