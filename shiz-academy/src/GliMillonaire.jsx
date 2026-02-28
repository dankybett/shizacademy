import React, { useEffect, useMemo, useState } from "react";
import quizData from "../data/quizData.js";

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

  const stepDifficulty = useMemo(() => {
    if (currentStep <= 4) return 1;
    if (currentStep <= 9) return 2;
    return 3; // steps 10-14
  }, [currentStep]);

  const loadQuestion = () => {
    const pool = quizData.filter((q) => q.difficulty === stepDifficulty);
    if (!pool.length) {
      setQuestion(null);
      return;
    }
    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && pick?.id === lastQuestionId) {
      // try once more to avoid immediate repeat
      pick = pool[(pool.indexOf(pick) + 1) % pool.length];
    }
    setQuestion(pick);
    setLastQuestionId(pick?.id || null);
  };

  useEffect(() => {
    if (!gameOver && !celebrate) loadQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, stepDifficulty]);

  useEffect(() => {
    // initial load
    loadQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = (selectedIdx) => {
    if (!question) return;
    if (selectedIdx === question.correctAnswer) {
      try {
        onWin(question.requiredLoreId);
      } catch (e) {
        // consumer handles side-effects
      }
      const isFinal = currentStep >= MONEY_LADDER.length - 1;
      if (isFinal) {
        setCelebrate(true);
      } else {
        setCurrentStep((s) => s + 1);
      }
    } else {
      setGameOver(true);
    }
  };

  const onSelect = (idx) => {
    setPressedIdx(idx);
    setTimeout(() => {
      setPressedIdx(null);
      handleAnswer(idx);
    }, 150);
  };

  const handleTryAgain = () => {
    setGameOver(false);
    setCelebrate(false);
    setCurrentStep(0);
    loadQuestion();
  };

  if (!quizData.length) {
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
            >
              <span style={{ color: "#fbbf24", fontWeight: 900 }}>Q:</span>
              <span style={{ opacity: 0.95 }}>{question ? question.question : 'Loading question...'}</span>
            </div>
          </div>
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
                  return (
                    <div
                      key={step}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "1px solid " + (active ? "#f59e0b" : "#253041"),
                        background: active ? "rgba(245, 158, 11, 0.15)" : "#0f1522",
                        color: active ? "#fde68a" : "#cbd5e1",
                        fontWeight: active ? 800 : 600,
                        fontSize: 12,
                        marginLeft: -6,
                      }}
                      title={`Step ${step + 1}`}
                    >
                      <span style={{ opacity: 0.9 }}>{step + 1}</span>
                      <span style={{ fontVariantNumeric: "tabular-nums" }}>{amt.toLocaleString()}</span>
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
