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
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 8,
          borderBottom: "1px solid #253041",
        }}
      >
        <div style={{ fontWeight: 700 }}>Gli-Millonaire</div>
        <div style={{ display: "inline-flex", gap: 10, alignItems: "baseline", opacity: 0.9 }}>
          <span>Step {currentStep + 1} / {MONEY_LADDER.length}</span>
          <span style={{ fontWeight: 800, color: "#93c5fd" }}>{MONEY_LADDER[currentStep]} glims</span>
        </div>
      </header>

      <div style={{ fontSize: 18, lineHeight: 1.5 }}>{question ? question.question : 'Loading question...'}</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}
      >
        {(question?.options || []).map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(idx)}
            style={{
              padding: "0.75rem 1rem",
              textAlign: "left",
              borderRadius: 8,
              border: "1px solid #253041",
              background: "#101621",
              color: "#cbd5e1",
              cursor: "pointer",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default GliMillonaire;
