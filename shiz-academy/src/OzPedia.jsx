import React, { useEffect, useMemo, useState } from "react";
import loreData from "../data/loreData.js";

function OzPedia({ unlockedLoreIds = [] }) {
  const unlockedSet = useMemo(() => new Set(unlockedLoreIds), [unlockedLoreIds]);

  const unlockedEntries = useMemo(
    () => loreData.filter((entry) => unlockedSet.has(entry.id)),
    [unlockedSet]
  );

  const [query, setQuery] = useState("");
  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return unlockedEntries;
    return unlockedEntries.filter((e) => {
      const t = (e.title || "").toLowerCase();
      const c = (e.content || "").toLowerCase();
      return t.includes(q) || c.includes(q);
    });
  }, [unlockedEntries, query]);

  const CATEGORY_LABELS = {
    MUNCH: "Munchkinland",
    SOUTH: "The South",
    NORTH: "The North",
    DRIVE: "Phosphor-Drive",
    WIZMAS: "Wizmas",
    WIZ: "Wizmas",
    SILVER: "Silver & Mines",
    IRON: "Iron Overture",
    BOAR: "Boar-Man Woods",
    MOTH: "Emeraldwave",
    SHOP: "Am-Oz-on",
    BUBBLE: "MyBubble",
    DUST: "Oz Dust Ball",
    RIVER: "Great Broad River",
    BEAR: "Hibernation Grunge",
    CLAY: "Porcelain Hills",
    CURRENCY: "Glims & Currency",
    INSTRUMENT: "Instruments",
  };

  const groups = useMemo(() => {
    const map = new Map();
    const getKey = (id) => {
      if (!id) return "MISC";
      const parts = String(id).split("-");
      return parts.length >= 3 ? parts[1] : "MISC";
    };
    filteredEntries.forEach((e) => {
      const key = getKey(e.id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    });
    const arr = Array.from(map.entries()).map(([key, entries]) => {
      const label = CATEGORY_LABELS[key] || (key.charAt(0) + key.slice(1).toLowerCase());
      // sort entries by title for consistency
      entries.sort((a, b) => a.title.localeCompare(b.title));
      return { key, label, entries };
    });
    // sort groups alphabetically by label
    arr.sort((a, b) => a.label.localeCompare(b.label));
    return arr;
  }, [filteredEntries]);

  const [selectedId, setSelectedId] = useState(
    unlockedEntries.length ? unlockedEntries[0].id : null
  );

  useEffect(() => {
    if (!unlockedEntries.length) {
      setSelectedId(null);
      return;
    }
    // Ensure selectedId stays within current filtered list
    const inFiltered = filteredEntries.find((e) => e.id === selectedId);
    if (!inFiltered) {
      setSelectedId(filteredEntries.length ? filteredEntries[0].id : unlockedEntries[0].id);
    }
  }, [unlockedEntries, filteredEntries, selectedId]);

  if (!unlockedEntries.length) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "300px",
          padding: "1rem",
          textAlign: "center",
          background: "#0b0f14",
          color: "#cbd5e1",
          border: "1px solid #253041",
          borderRadius: 8,
        }}
      >
        Database corrupted. Win Gli-millonaire rounds to recover data.
      </div>
    );
  }

  const selected = unlockedEntries.find((e) => e.id === selectedId) || null;

  return (
    <div
      style={{
        display: "flex",
        gap: "0",
        width: "100%",
        minHeight: "300px",
        border: "1px solid #253041",
        borderRadius: 8,
        overflow: "hidden",
        background: "#0b0f14",
        color: "#e2e8f0",
      }}
    >
      <aside
        style={{
          width: 260,
          background: "#101621",
          borderRight: "1px solid #253041",
          overflowY: "auto",
          padding: "0.5rem 0.25rem",
        }}
      >
        <div style={{ padding: "6px 8px" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #253041",
              background: "#0f1522",
              color: "#cbd5e1",
              outline: "none",
            }}
          />
        </div>
        {groups.map((g) => (
          <div key={g.key}>
            <div style={{
              padding: "6px 10px",
              margin: "6px 6px 2px 6px",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              opacity: 0.8,
              color: "#9fb3c8",
              textTransform: "uppercase",
            }}>
              {g.label}
            </div>
            {g.entries.map((entry) => {
              const active = entry.id === selectedId;
              return (
                <button
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.6rem 0.75rem",
                    margin: "0.25rem 0.25rem",
                    borderRadius: 6,
                    border: "1px solid " + (active ? "#4f46e5" : "#253041"),
                    background: active ? "#1b2340" : "#0f1522",
                    color: active ? "#e5e7eb" : "#cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  {entry.title}
                </button>
              );
            })}
          </div>
        ))}
      </aside>
      <main
        style={{
          flex: 1,
          padding: "1rem 1.25rem",
          overflowY: "auto",
          lineHeight: 1.6,
          background: "#0b0f14",
        }}
      >
        {selected ? (
          <div>
            <h2 style={{ margin: 0, marginBottom: "0.5rem", fontSize: 22 }}>
              {selected.title}
            </h2>
            <div
              style={{
                opacity: 0.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {selected.content}
            </div>
            <div style={{ marginTop: 10, borderTop: "1px solid #253041", paddingTop: 6, display: "flex", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>
                Word Count: {(() => {
                  const text = selected.content || "";
                  const words = text.trim().length ? text.trim().split(/\s+/) : [];
                  return words.length;
                })()}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ opacity: 0.8 }}>Select a lore entry to read.</div>
        )}
      </main>
    </div>
  );
}

export default OzPedia;
