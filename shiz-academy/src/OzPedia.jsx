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
    EMERALD: "The Emerald City",
    GILIKIN: "Gilikin",
    QUADLING: "Quadling Country",
    VINKUS: "The Vinkus (Winkie Country)",
    GLIKKUS: "The Glikkus",
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
  const [view, setView] = useState('categories'); // 'categories' | 'group'
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);

  const renderContent = (text) => {
    if (!text) return null;
    const lines = String(text).split(/\r?\n/);
    const out = [];
    let buf = [];
    let listBuf = [];
    const flushParagraph = () => {
      if (buf.length) {
        out.push(
          <p key={out.length} style={{ margin: '0 0 0.75rem 0' }}>
            {buf.join(' ')}
          </p>
        );
        buf = [];
      }
    };
    const flushList = () => {
      if (listBuf.length) {
        out.push(
          <ul key={'ul-' + out.length} style={{ margin: '0 0 0.75rem 1.1rem' }}>
            {listBuf.map((li, i) => (
              <li key={i} style={{ marginBottom: 4 }}>{li}</li>
            ))}
          </ul>
        );
        listBuf = [];
      }
    };

    const isMinistry = (s) => /^The\s+Ministry\s+of\s+/.test(s.trim());
    const isBullet = (s) => /^[-•]\s+/.test(s.trim());

    lines.forEach((raw) => {
      const line = raw.trim();
      if (!line) {
        flushParagraph();
        flushList();
        return;
      }
      if (isMinistry(line)) {
        flushParagraph();
        listBuf.push(line);
        return;
      }
      if (isBullet(line)) {
        flushParagraph();
        listBuf.push(line.replace(/^[-•]\s+/,'').trim());
        return;
      }
      // normal text: accumulate
      buf.push(line);
    });
    flushParagraph();
    flushList();
    return out;
  };

  // New single-column UI: categories list -> group view with Back
  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '300px',
    border: '1px solid #253041',
    borderRadius: 8,
    overflow: 'hidden',
    background: '#0b0f14',
    color: '#e2e8f0',
  };

  if (view === 'categories') {
    return (
      <div style={containerStyle}>
        <div style={{ padding: '0.75rem', borderBottom: '1px solid #253041', background: '#101621' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 8,
              border: '1px solid #253041', background: '#0f1522', color: '#cbd5e1', outline: 'none'
            }}
          />
        </div>
        <div className="hide-scrollbar" style={{ padding: '0.5rem', overflowY: 'auto' }}>
          {groups.map((g) => (
            <button
              key={g.key}
              onClick={() => { setSelectedGroupKey(g.key); setView('group'); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left', padding: '0.8rem 0.9rem', margin: '0.4rem 0.25rem',
                borderRadius: 8, border: '1px solid #253041', background: '#0f1522', color: '#cbd5e1', cursor: 'pointer'
              }}
            >
              <span style={{ fontWeight: 800 }}>{g.label}</span>
              <span style={{ fontSize: 12, opacity: 0.75 }}>{g.entries.length}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Group detail view
  const group = groups.find((gg) => gg.key === selectedGroupKey) || null;
  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.75rem 0.75rem', borderBottom: '1px solid #253041', background: '#101621' }}>
        <button
          onClick={() => setView('categories')}
          style={{ border: '1px solid #253041', background: '#0f1522', color: '#e5e7eb', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
        >
          Back
        </button>
        <div style={{ fontWeight: 900, marginLeft: 6 }}>{group ? group.label : 'Lore'}</div>
      </div>
      <div className="hide-scrollbar" style={{ padding: '0.9rem 1rem', overflowY: 'auto', lineHeight: 1.6 }}>
        {group ? (
          group.entries.map((entry) => (
            <div key={entry.id} style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, marginBottom: '0.35rem', fontSize: 18 }}>{entry.title}</h3>
              <div style={{ opacity: 0.9 }}>
                {renderContent(entry.content)}
              </div>
            </div>
          ))
        ) : (
          <div style={{ opacity: 0.8 }}>No entries.</div>
        )}
      </div>
    </div>
  );
}

export default OzPedia;
