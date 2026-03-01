import React, { useEffect, useMemo, useRef, useState } from "react";
import quizData from "../data/quizData.js";
import songs from "../data/songs.js";
import hostMessages from "../data/hostMessages.js";

const MONEY_LADDER = [
  100, 200, 300, 500, 1000,
  2000, 4000, 8000, 16000, 32000,
  64000, 125000, 250000, 500000, 1000000,
];

  function GliMillonaire({ onWin = () => {} }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [celebrate, setCelebrate] = useState(false);
    const [question, setQuestion] = useState(null);
    const [lastQuestionId, setLastQuestionId] = useState(null);
    const [pressedIdx, setPressedIdx] = useState(null);
    const [hoveredIdx, setHoveredIdx] = useState(null);
    const [phase, setPhase] = useState('host'); // 'host' | 'qa' | 'feedback'
    const [hostText, setHostText] = useState(hostMessages.Intro);
    const [pendingAdvance, setPendingAdvance] = useState(false);
    const [pendingCelebrate, setPendingCelebrate] = useState(false);
    const [pendingWrong, setPendingWrong] = useState(false);
    const [guaranteed, setGuaranteed] = useState(0);
    const [winnings, setWinnings] = useState(0);
    const [pulseStep, setPulseStep] = useState(null);
    const [started, setStarted] = useState(false);
    const [playedIntroContinue, setPlayedIntroContinue] = useState(false);
  const pulseTimerRef = useRef(null);
  const correctSfxRef = useRef(null);
  const wrongSfxRef = useRef(null);
  const openingThemeRef = useRef(null);
  const openingFadeRef = useRef(null);
  const musicAudioRef = useRef(null);
  const musicStopTimerRef = useRef(null);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const startSfxRef = useRef(null);

  const triggerSafetyPulse = (idx) => {
    try { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); } catch {}
    setPulseStep(idx);
    pulseTimerRef.current = setTimeout(() => setPulseStep(null), 1200);
  };

  useEffect(() => {
    // Preload SFX
    try {
      correctSfxRef.current = new Audio('/sounds/quiz/correct.mp3');
      wrongSfxRef.current = new Audio('/sounds/quiz/wrong.mp3');
      if (correctSfxRef.current) correctSfxRef.current.volume = 0.9;
      if (wrongSfxRef.current) wrongSfxRef.current.volume = 0.9;
      startSfxRef.current = new Audio('/sounds/quiz/startsound.mp3');
      if (startSfxRef.current) startSfxRef.current.volume = 1.0;
    } catch {}
    return () => {
      try { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); } catch {}
      try { if (correctSfxRef.current) { correctSfxRef.current.pause(); correctSfxRef.current = null; } } catch {}
      try { if (wrongSfxRef.current) { wrongSfxRef.current.pause(); wrongSfxRef.current = null; } } catch {}
      // ensure opening theme stops on unmount (no fade needed during teardown)
      try {
        if (openingFadeRef.current) { clearInterval(openingFadeRef.current); openingFadeRef.current = null; }
        if (openingThemeRef.current) { openingThemeRef.current.pause(); openingThemeRef.current = null; }
      } catch {}
      try { if (startSfxRef.current) { startSfxRef.current.pause(); startSfxRef.current = null; } } catch {}
    };
  }, []);

  const playCorrect = () => { try { const a = correctSfxRef.current; if (a) { a.currentTime = 0; a.play().catch(()=>{}); } } catch {} };
  const playWrong = () => { try { const a = wrongSfxRef.current; if (a) { a.currentTime = 0; a.play().catch(()=>{}); } } catch {} };
  const playStartSound = () => { try { const a = startSfxRef.current; if (a) { a.currentTime = 0; a.play().catch(()=>{}); } } catch {} };

  const startOpeningTheme = () => {
    try {
      if (openingThemeRef.current) return; // already created
      const a = new Audio('/sounds/quiz/openingtheme.mp3');
      a.loop = true;
      a.volume = 0;
      openingThemeRef.current = a;
      a.play().catch(() => {});
      let v = 0;
      const target = 0.7;
      if (openingFadeRef.current) { clearInterval(openingFadeRef.current); }
      openingFadeRef.current = setInterval(() => {
        try {
          v = Math.min(target, v + 0.07);
          if (openingThemeRef.current) openingThemeRef.current.volume = v;
          if (v >= target) {
            clearInterval(openingFadeRef.current);
            openingFadeRef.current = null;
          }
        } catch {
          clearInterval(openingFadeRef.current);
          openingFadeRef.current = null;
        }
      }, 50);
    } catch {}
  };

  const stopOpeningTheme = (fade = true) => {
    try {
      const a = openingThemeRef.current;
      if (!a) return;
      if (openingFadeRef.current) { clearInterval(openingFadeRef.current); openingFadeRef.current = null; }
      if (!fade) {
        a.pause();
        openingThemeRef.current = null;
        return;
      }
      let v = a.volume;
      const h = setInterval(() => {
        try {
          v = Math.max(0, v - 0.08);
          if (openingThemeRef.current) openingThemeRef.current.volume = v;
          if (v <= 0) {
            clearInterval(h);
            try { if (openingThemeRef.current) openingThemeRef.current.pause(); } catch {}
            openingThemeRef.current = null;
          }
        } catch {
          clearInterval(h);
        }
      }, 50);
    } catch {}
  };

  const stepDifficulty = useMemo(() => {
    if (currentStep <= 4) return 1;
    if (currentStep <= 9) return 2;
    return 3; // steps 10-14
  }, [currentStep]);

  const usedQuestionIdsRef = useRef(new Set());
  const MUSIC_STEPS = useMemo(() => new Set([4, 9, 14]), []); // 0-based: questions 5, 10, 15
  const MUSIC_CLIP_DUR = 1.5; // seconds

  const makeMusicQuestion = (song, songList) => {
    const distractors = [];
    const others = songList.filter((x) => x.id !== song.id);
    // shuffle others lightweight
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    for (let i = 0; i < others.length && distractors.length < 3; i++) {
      if (!distractors.find((d) => d.title === others[i].title)) distractors.push(others[i]);
    }
    const titles = [song.title, ...distractors.map((d) => d.title)];
    // shuffle titles + compute correct index
    const indexed = titles.map((t, i) => ({ t, i }));
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }
    const options = indexed.map((x) => x.t);
    const correctAnswer = options.findIndex((t) => t === song.title);

    const dur = MUSIC_CLIP_DUR;
    const baseStart = typeof song.clipStart === 'number' ? song.clipStart : 0;
    const winStart = typeof song.clipWindowStart === 'number' ? song.clipWindowStart : Math.max(0, baseStart - 5);
    const winEnd = typeof song.clipWindowEnd === 'number' ? song.clipWindowEnd : baseStart + 10;
    const span = Math.max(0, (winEnd - winStart) - dur);
    const clipStart = winStart + (span > 0 ? Math.random() * span : 0);

    return {
      id: `MUSIC-${song.id}`,
      type: 'music',
      question: 'Name this song',
      options,
      correctAnswer,
      songSrc: song.src,
      clipStart,
      clipDur: dur,
      difficulty: song.difficulty || 1,
    };
  };

  const loadQuestion = () => {
    const isMusicStep = MUSIC_STEPS.has(currentStep);
    let basePool;
    if (isMusicStep) {
      const songPool = songs.filter((s) => (s.difficulty || 1) === stepDifficulty);
      if (!songPool.length) {
        basePool = [];
      } else {
        // choose a song not yet used
        const unusedSongs = songPool.filter((s) => !usedQuestionIdsRef.current.has(`MUSIC-${s.id}`));
        const srcSongs = unusedSongs.length ? unusedSongs : songPool;
        const songPick = srcSongs[Math.floor(Math.random() * srcSongs.length)];
        const q = makeMusicQuestion(songPick, songs);
        basePool = [q];
      }
    } else {
      basePool = quizData.filter((q) => q.difficulty === stepDifficulty);
    }
    if (!basePool.length) {
      setQuestion(null);
      return;
    }
    const unused = basePool.filter((q) => !usedQuestionIdsRef.current.has(q.id));
    const src = unused.length ? unused : basePool;
    let pick = src[Math.floor(Math.random() * src.length)];
    if (src.length > 1 && pick?.id === lastQuestionId) {
      // try once more to avoid immediate repeat
      const idx = src.indexOf(pick);
      pick = src[(idx + 1) % src.length];
    }
    setQuestion(pick);
    setLastQuestionId(pick?.id || null);
    try { if (pick?.id != null) usedQuestionIdsRef.current.add(pick.id); } catch {}
  };

  useEffect(() => {
    if (started && !gameOver && !celebrate) loadQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, stepDifficulty]);

  useEffect(() => {
    // initial load gated by start; also manage opening theme lifecycle
    if (started) {
      // fade out theme and proceed
      stopOpeningTheme(true);
      // reset per-round question usage
      try { usedQuestionIdsRef.current = new Set(); } catch {}
      setLastQuestionId(null);
      loadQuestion();
      setPhase('host');
      setHostText(hostMessages.Intro);
    } else {
      // entering opening screen: start theme
      startOpeningTheme();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  // Manage music question audio lifecycle
  useEffect(() => {
    // Cleanup any pending timers on question change
    try { if (musicStopTimerRef.current) { clearTimeout(musicStopTimerRef.current); musicStopTimerRef.current = null; } } catch {}
    setMusicPlaying(false);
    try { if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current = null; } } catch {}
    if (question && question.type === 'music') {
      try {
        const a = new Audio(question.songSrc);
        a.preload = 'auto';
        musicAudioRef.current = a;
      } catch {}
    }
    return () => {
      try { if (musicStopTimerRef.current) { clearTimeout(musicStopTimerRef.current); musicStopTimerRef.current = null; } } catch {}
      try { if (musicAudioRef.current) { musicAudioRef.current.pause(); musicAudioRef.current = null; } } catch {}
      setMusicPlaying(false);
    };
  }, [question]);

  const playMusicClip = () => {
    if (!question || question.type !== 'music') return;
    try { if (musicStopTimerRef.current) { clearTimeout(musicStopTimerRef.current); musicStopTimerRef.current = null; } } catch {}
    try {
      const a = musicAudioRef.current;
      if (!a) return;
      a.currentTime = Math.max(0, question.clipStart || 0);
      setMusicPlaying(true);
      a.play().catch(() => { setMusicPlaying(false); });
      const dur = Math.max(0.1, question.clipDur || 3);
      musicStopTimerRef.current = setTimeout(() => {
        try { a.pause(); } catch {}
        setMusicPlaying(false);
        musicStopTimerRef.current = null;
      }, dur * 1000);
    } catch {
      setMusicPlaying(false);
    }
  };

  const handleAnswer = (selectedIdx) => {
    if (!question) return;
    if (selectedIdx === question.correctAnswer) {
      try { onWin(question.requiredLoreId); } catch {}
      setPhase('feedback');
      setHostText(hostMessages.Correct);
      playCorrect();
      const isFinal = currentStep >= MONEY_LADDER.length - 1;
      setPendingCelebrate(isFinal);
      setPendingAdvance(!isFinal);
      setPendingWrong(false);
    } else {
      setPhase('feedback');
      setHostText(hostMessages.Wrong);
      playWrong();
      setPendingAdvance(false);
      setPendingCelebrate(false);
      setPendingWrong(true);
    }
  };

  const onSelect = (idx) => {
    setPressedIdx(idx);
    setTimeout(() => {
      setPressedIdx(null);
      handleAnswer(idx);
    }, 150);
  };

  const handleHostAdvance = () => {
    if (phase === 'host') {
      if (!playedIntroContinue && started && currentStep === 0) {
        playStartSound();
        setPlayedIntroContinue(true);
      }
      setPhase('qa');
      return;
    }
    if (phase === 'feedback') {
      if (pendingWrong) {
        setPendingWrong(false);
        setWinnings(guaranteed || 0);
        setGameOver(true);
        return;
      }
      if (pendingCelebrate) {
        setPendingCelebrate(false);
        setCelebrate(true);
        return;
      }
      if (pendingAdvance) {
        const next = currentStep + 1;
        const lastIdx = MONEY_LADDER.length - 1;
        setPendingAdvance(false);
        if (currentStep === 4) setGuaranteed(MONEY_LADDER[4]);
        if (currentStep === 9) setGuaranteed(MONEY_LADDER[9]);
        if (next === lastIdx) {
          setHostText(hostMessages.FinalQuestion);
          setPhase('host');
          setCurrentStep(next);
        } else if (next === 4) {
          setHostText(hostMessages.Safety1k);
          setPhase('host');
          setCurrentStep(next);
          triggerSafetyPulse(4);
        } else if (next === 9) {
          setHostText(hostMessages.Safety32k);
          setPhase('host');
          setCurrentStep(next);
          triggerSafetyPulse(9);
        } else {
          setCurrentStep(next);
          setPhase('qa');
        }
      }
    }
  };

  const handleTryAgain = () => {
    setGameOver(false);
    setCelebrate(false);
    setCurrentStep(0);
    setGuaranteed(0);
    setWinnings(0);
    setPhase('host');
    setHostText(hostMessages.Intro);
    setPlayedIntroContinue(false);
    setPendingAdvance(false);
    setPendingCelebrate(false);
    setPendingWrong(false);
    setPressedIdx(null);
    setHoveredIdx(null);
    try { usedQuestionIdsRef.current = new Set(); } catch {}
    try { if (correctSfxRef.current) { correctSfxRef.current.pause(); correctSfxRef.current.currentTime = 0; } } catch {}
    try { if (wrongSfxRef.current) { wrongSfxRef.current.pause(); wrongSfxRef.current.currentTime = 0; } } catch {}
    loadQuestion();
  };

  if (!quizData.length && started) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 240,
          border: "1px solid #253041",
          borderRadius: 8,
          background: "transparent",
          color: "#cbd5e1",
          transform: "translateX(-18px)",
        }}
      >
        No questions available.
      </div>
    );
  }

  if (!started) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'min(80vh, 520px)',
          borderRadius: 12,
          overflow: 'hidden',
          color: '#e2e8f0',
        }}
      >
        <img
          src={'/art/glimillionaire/openingscreen.png'}
          alt="Glim-illionaire"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e)=>{ e.currentTarget.style.display='none'; }}
        />
        <button
          onClick={() => setStarted(true)}
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            padding: '10px 16px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,.35)',
            background: 'rgba(255,255,255,.92)',
            color: 'black',
            fontWeight: 900,
            cursor: 'pointer'
          }}
        >
          Start
        </button>
      </div>
    );
  }

  if (celebrate) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          minHeight: 260,
          border: "1px solid #253041",
          borderRadius: 8,
          background: "transparent",
          color: "#e2e8f0",
          padding: 24,
          transform: "translateX(-18px)",
        }}
      >
        <div style={{ fontSize: 28, color: "#22c55e", fontWeight: 800 }}>Gli‑millonaire!</div>
        <div style={{ opacity: 0.9 }}>You won {MONEY_LADDER[MONEY_LADDER.length - 1]} glims!</div>
        <button
          onClick={handleTryAgain}
          style={{
            padding: "0.6rem 1rem",
            borderRadius: 8,
            border: "1px solid #4f46e5",
            background: "#1b2340",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          Play Again
        </button>
      </div>
    );
  }

  if (gameOver) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          minHeight: 260,
          border: "1px solid #253041",
          borderRadius: 8,
          background: "transparent",
          color: "#e2e8f0",
          padding: 24,
          transform: "translateX(-18px)",
        }}
      >
        <div style={{ fontSize: 28, color: "#ef4444" }}>Game Over</div>
        <div style={{ opacity: 0.9 }}>You won {Number(winnings||0).toLocaleString()} glims.</div>
        <button
          onClick={handleTryAgain}
          style={{
            padding: "0.6rem 1rem",
            borderRadius: 8,
            border: "1px solid #4f46e5",
            background: "#1b2340",
            color: "#e5e7eb",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        width: "100%",
        minHeight: 260,
        border: "1px solid #253041",
        borderRadius: 8,
        background: "transparent",
        color: "#e2e8f0",
        padding: 16,
        transform: "translateX(-18px)",
      }}
    >
      {/* Header removed per request */}
      <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 12,
            border: "1px solid #253041",
            borderRadius: 10,
            backgroundImage: "url('/art/glimillionaire/quizbackground.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div style={{ transform: "scale(0.75)", transformOrigin: "center top", display: "flex", justifyContent: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "0.95rem 1.2rem",
                fontSize: 18,
                lineHeight: 1.5,
                color: "#e2e8f0",
                background: "#0b0f14",
                clipPath: "polygon(2.5% 0, 97.5% 0, 100% 50%, 97.5% 100%, 2.5% 100%, 0 50%)",
                boxShadow: "inset 0 0 0 2px #2a3a52, 0 2px 6px rgba(0,0,0,.25)",
                width: '100%',
                maxWidth: 620,
              }}
              onClick={handleHostAdvance}
            >
              {phase === 'qa' ? (
                <>
                  <span style={{ color: "#fbbf24", fontWeight: 900 }}>Q:</span>
                  <span style={{ opacity: 0.95 }}>{question ? question.question : 'Loading question...'}</span>
                </>
              ) : (
                <>
                  <span style={{ color: "#93c5fd", fontWeight: 900 }}>Host:</span>
                  <span style={{ opacity: 0.95 }}>{hostText}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.7 }}>(tap to continue)</span>
                </>
              )}
            </div>
          </div>
          {phase === 'qa' && question?.type === 'music' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <button
                onClick={playMusicClip}
                style={{
                  padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #4f46e5', background: musicPlaying ? '#142037' : '#1b2340', color: '#e5e7eb',
                  cursor: 'pointer', fontWeight: 800
                }}
                disabled={musicPlaying}
                aria-label="Play 1.5-second clip"
                title="Play 1.5-second clip"
              >
                {musicPlaying ? 'Playing…' : 'Play 1.5s Clip'}
              </button>
            </div>
          )}
          {phase === 'qa' && (
            <div style={{ transform: "scale(0.75)", transformOrigin: "center bottom", display: "flex", justifyContent: "center", marginBottom: -6 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, width: '100%', maxWidth: 620 }}>
                {(question?.options || []).map((opt, idx) => {
                const isLeft = idx % 2 === 0;
                const isHovered = hoveredIdx === idx;
                const isPressed = pressedIdx === idx;
                const borderColor = isPressed ? "#22c55e" : isHovered ? "#4f46e5" : "#2a3a52";
                const fill = isPressed ? "#142037" : isHovered ? "#101e33" : "#0b0f14";
                const hexStyle = {
                  padding: "0.9rem 1.1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  gap: 8,
                  color: "#cbd5e1",
                  background: fill,
                  clipPath: "polygon(4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%, 0 50%)",
                  boxShadow: `inset 0 0 0 2px ${borderColor}, 0 2px 6px rgba(0,0,0,.25)`,
                  transition: "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
                  transform: isPressed ? "scale(0.985)" : "none",
                  cursor: "pointer",
                  outline: "none",
                  border: "none",
                };
                const labelStyle = { color: "#fbbf24", fontWeight: 900 };
                const LETTERS = ["A", "B", "C", "D"];
                return (
                  <button
                    key={idx}
                    onClick={() => onSelect(idx)}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    style={hexStyle}
                  >
                    <span style={labelStyle}>{LETTERS[idx]}:</span>
                    <span style={{ opacity: 0.92 }}>{opt}</span>
                  </button>
                );
              })}
              </div>
            </div>
          )}
        </div>
        <aside style={{ width: 170, borderLeft: "1px solid #253041", paddingLeft: 12, paddingTop: 8, paddingBottom: 8, background: "rgba(15,21,34,0.9)", borderRadius: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 0.6, marginBottom: 6, opacity: 0.8, textAlign: 'center' }}>Glim-illionaire Ladder</div>
          {(() => {
            const N = MONEY_LADDER.length; // 15
            const VISIBLE = 7;
            const TOP = N - 1;
            const rowsDesc = [];

            // Always show top prize first
            rowsDesc.push({ t: 'step', i: TOP });

            // Decide if a gap is needed between the top prize and the window ending at current
            // We try to allocate windowRows either (VISIBLE-2) if gap is needed, or (VISIBLE-1) if contiguous up to top
            let windowRows = VISIBLE - 2; // rows for the descending window above current when gap exists
            const canReachTopMinus1 = (currentStep + (windowRows - 1)) >= (TOP - 1);
            let needGap = !canReachTopMinus1;
            if (!needGap) {
              // If we can reach top-1, we don't need the gap; allocate one extra row to the window
              windowRows = VISIBLE - 1;
            }

            // Compute high bound (largest step in the window), clamp to top-1
            let high = Math.min(TOP - 1, currentStep + (windowRows - 1));
            // Ensure the window ends at the current step (current pinned at bottom)
            // So the sequence we render will be: high, high-1, ..., currentStep
            // Cap high so we show at most windowRows items
            const maxHigh = currentStep + (windowRows - 1);
            high = Math.min(high, maxHigh, TOP - 1);

            if (needGap) rowsDesc.push({ t: 'gap' });
            for (let i = high; i >= currentStep && rowsDesc.length < VISIBLE; i--) {
              rowsDesc.push({ t: 'step', i });
            }

            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rowsDesc.map((row, idx) => {
                  if (row.t === 'gap') {
                    return (
                      <div key={`gap-${idx}`} style={{ height: 28, display:'flex', alignItems:'center', justifyContent:'center', color:'#9fb3c8', marginLeft: -6 }}>…</div>
                    );
                  }
                  const step = row.i;
                  const amt = MONEY_LADDER[step];
                  const active = step === currentStep;
                  const safety = (step === 4 || step === 9); // 1,000 and 32,000
                  const pulsing = step === pulseStep;
                  return (
                    <div
                      key={step}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid " + (active ? "#f59e0b" : safety ? "#14b8a6" : "#253041"),
                        background: active ? "rgba(245, 158, 11, 0.15)" : safety ? "rgba(20,184,166,0.12)" : "#0f1522",
                        color: active ? "#fde68a" : "#cbd5e1",
                        fontWeight: active ? 800 : 600,
                        fontSize: 12,
                        marginLeft: -6,
                        boxShadow: pulsing ? '0 0 0 2px rgba(20,184,166,0.5), 0 0 14px rgba(20,184,166,0.35)' : 'none',
                      }}
                      title={`Step ${step + 1}`}
                    >
                      <span style={{ opacity: 0.9 }}>{step + 1}</span>
                      <span style={{ display:'inline-flex', alignItems:'center' }}>
                        <span style={{ fontVariantNumeric: "tabular-nums" }}>{amt.toLocaleString()}</span>
                        {safety && (
                          <span style={{ marginLeft: 6, fontSize: 10, color: active ? '#fde68a' : '#5eead4', fontWeight: 800 }}>SAFE</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </aside>
      </div>
    </div>
  );
}

export default GliMillonaire;
