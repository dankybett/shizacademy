import { Fragment, useEffect, useState } from 'react'
import luminaO from './scripts/luminaO.js'
import griswald from './scripts/griswald.js'

export default function VisualNovelModal({
  open,
  friendModal,
  setFriendModal,
  performerName,
  styles,
  friends,
  setFriends,
  setNudges,
  setBonusRolls,
  pushToast,
  setWriting,
  rainfallUnlocked,
  setRainfallUnlocked,
  polaroidUnlocked,
  setPolaroidUnlocked,
  unlockedPosters,
  setUnlockedPosters,
  currentPosterIdx,
  setCurrentPosterIdx,
  lampGiftOpen,
  setLampGiftOpen,
  lampUnlocked,
  setLampUnlocked,
  midnightHazeGiftOpen,
  setMidnightHazeGiftOpen,
  midnightHazeUnlocked,
  setMidnightHazeUnlocked,
  POSTERS,
}) {

  const friendId = friendModal.friendId || 'luminaO';

  const scripts = { luminaO, griswald };

  const FRIEND_META = {
    luminaO: { name: 'Lumina-O', bust: '/art/friends/luminao_bust.png' },
    griswald: { name: 'Griswald', bust: '/art/friends/griswald_bust.png' },
  };

  const lines = (scripts[friendId] && scripts[friendId][friendModal.targetLevel]) || [ { speaker:'lumina', text:'...' } ];
  const idx = Math.max(0, Math.min(friendModal.idx || 0, lines.length-1));
  const rawLine = lines[idx] || null;
  const isChoiceStep = !!(rawLine && rawLine.type === 'choice');
  const choiceIndex = (typeof friendModal.choiceIndex === 'number') ? friendModal.choiceIndex : null;
  const isLeft = rawLine && rawLine.speaker === 'player';
  const line = isChoiceStep ? null : rawLine;
  const leftActive = !!isLeft;
  const rightActive = !isLeft;
  const friendMeta = FRIEND_META[friendId] || { name: friendId, bust: '/art/friends/luminao_bust.png' };

  // Typing effect (component-local)
  const [vnTyping, setVnTyping] = useState(false);
  const [vnTypingTick, setVnTypingTick] = useState(0);
  const [grisGiftOpen, setGrisGiftOpen] = useState(false);
  const [rainGiftOpen, setRainGiftOpen] = useState(false);
  const [polaroidGiftOpen, setPolaroidGiftOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    setVnTyping(true);
    setVnTypingTick(0);
    const int = setInterval(() => setVnTypingTick(t => (t + 1) % 3), 250);
    const to = setTimeout(() => { setVnTyping(false); clearInterval(int); }, 900);
    return () => { clearInterval(int); clearTimeout(to); };
  }, [open, friendModal.idx, friendModal.targetLevel]);

  // Gift triggers tied to VN line index milestones
  useEffect(() => {
    try {
      if (!open) return;
      const fid = friendModal.friendId || 'luminaO';
      if (fid !== 'luminaO') return;
      if ((friendModal.targetLevel||0) !== 2) return;
      const i = friendModal.idx || 0;
      if (i === 5 && !lampUnlocked && !lampGiftOpen) {
        setLampUnlocked(true);
        setLampGiftOpen(true);
      }
    } catch { /* ignore */ }
  }, [open, friendModal.friendId, friendModal.targetLevel, friendModal.idx, lampUnlocked, lampGiftOpen, setLampUnlocked, setLampGiftOpen]);

  useEffect(() => {
    try {
      if (!open) return;
      const fid = friendModal.friendId || 'luminaO';
      if (fid !== 'luminaO') return;
      if ((friendModal.targetLevel||0) !== 4) return;
      const i = friendModal.idx || 0;
      if (i === 7 && !midnightHazeUnlocked && !midnightHazeGiftOpen) {
        setMidnightHazeUnlocked(true);
        setMidnightHazeGiftOpen(true);
      }
    } catch { /* ignore */ }
  }, [open, friendModal.friendId, friendModal.targetLevel, friendModal.idx, midnightHazeUnlocked, midnightHazeGiftOpen, setMidnightHazeUnlocked, setMidnightHazeGiftOpen]);

  // Griswald LV2: show notebook gift overlay at the gift line; apply writing +0.2 and mark claimed
  useEffect(() => {
    try {
      if (!open) return;
      const fid = friendModal.friendId || 'luminaO';
      if (fid !== 'griswald') return;
      if ((friendModal.targetLevel||0) !== 2) return;
      const i = friendModal.idx || 0;
      const line = lines[i];
      const alreadyClaimed = !!(friends?.griswald?.rewardsClaimed?.[2]);
      if (line && typeof line.text === 'string' && line.text.toLowerCase().includes('gift received') && !alreadyClaimed && !grisGiftOpen) {
        if (typeof setWriting === 'function') {
          setWriting(v => Math.max(0, Math.min(10, (v||0) + 0.2)));
        }
        setFriends(prev => ({ ...prev, griswald: { ...prev.griswald, rewardsClaimed: { ...(prev.griswald?.rewardsClaimed||{}), 2:true } } }));
        setGrisGiftOpen(true);
        pushToast('Griswald gift: Worn Lyric Notebook (+0.20 Writing)');
      }
    } catch { /* ignore */ }
  }, [open, friendModal.friendId, friendModal.targetLevel, friendModal.idx, lines, grisGiftOpen, friends, setFriends, setWriting, pushToast]);

  // Griswald LV4: unlock Rainfall Stage Lighting on gift line
  useEffect(() => {
    try {
      if (!open) return;
      const fid = friendModal.friendId || 'luminaO';
      if (fid !== 'griswald') return;
      if ((friendModal.targetLevel||0) !== 4) return;
      const i = friendModal.idx || 0;
      const line = lines[i];
      if (line && typeof line.text === 'string' && line.text.toLowerCase().includes('rainfall stage lighting') && !rainfallUnlocked) {
        setRainfallUnlocked(true);
        setRainGiftOpen(true);
        pushToast('Griswald gift: Rainfall Stage Lighting unlocked');
      }
    } catch { /* ignore */ }
  }, [open, friendModal.friendId, friendModal.targetLevel, friendModal.idx, lines, rainfallUnlocked, setRainfallUnlocked, pushToast]);

  // Griswald LV5: unlock Polaroid Photograph (desk keepsake)
  useEffect(() => {
    try {
      if (!open) return;
      const fid = friendModal.friendId || 'luminaO';
      if (fid !== 'griswald') return;
      if ((friendModal.targetLevel||0) !== 5) return;
      const i = friendModal.idx || 0;
      const line = lines[i];
      if (line && typeof line.text === 'string' && line.text.toLowerCase().includes('polaroid') && !polaroidUnlocked) {
        setPolaroidUnlocked(true);
        setPolaroidGiftOpen(true);
        pushToast('Griswald gift: Polaroid Photograph');
      }
    } catch { /* ignore */ }
  }, [open, friendModal.friendId, friendModal.targetLevel, friendModal.idx, lines, polaroidUnlocked, setPolaroidUnlocked, pushToast]);

  if (!open) return null;
  return (
    <div style={styles.overlay}>
      <div style={{ position:'relative', width:'100%', maxWidth: 720, height: 360, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 16, padding: 10, overflow:'hidden' }} onClick={(e)=>e.stopPropagation()}>
        <img src={'/art/mybubblelogo.png'} alt="myBubble" onError={(e)=>{ e.currentTarget.style.display='none'; }} style={styles.vnLogo} />
        <Fragment>
          <img
            src={'/art/friends/player_bust.png'}
            alt={'You'}
            style={{ ...styles.vnBustLeft, opacity: leftActive ? 1 : 0.6, transform:'translate(25px, 25px) scale(' + (leftActive ? 1.03 : 0.97) + ')', transition:'opacity 200ms ease, transform 200ms ease' }}
            onError={(e)=>{ e.currentTarget.style.display='none'; }}
          />
          <img
            src={friendMeta.bust}
            alt={friendMeta.name}
            style={{ ...styles.vnBustRight, opacity: rightActive ? 1 : 0.6, transform:'translateY(-65px) scale(' + (rightActive ? 1.03 : 0.97) + ')', transition:'opacity 200ms ease, transform 200ms ease' }}
            onError={(e)=>{ e.currentTarget.style.display='none'; }}
          />
          {!isChoiceStep && line && (
            <div style={{ position:'absolute', left: isLeft? 16 : 'auto', right: !isLeft? 16 : 'auto', bottom: 16, maxWidth: 420 }}>
              <div style={{ ...styles.vnBubble, ...(isLeft? styles.vnBubbleLeft : styles.vnBubbleRight) }}>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>{isLeft ? (performerName || 'You') : friendMeta.name}</div>
                <div>{vnTyping ? '.'.repeat((vnTypingTick||0)+1) : line.text}</div>
              </div>
            </div>
          )}
          {isChoiceStep && (
            <div style={{ position:'absolute', left: 0, right: 0, bottom: 16, display:'flex', justifyContent:'center' }}>
              {choiceIndex == null ? (
                <div style={{ display:'grid', gap:8, width:'90%', maxWidth: 520 }}>
                  {(rawLine.options||[]).map((opt, i) => (
                    <button key={i} style={styles.primaryBtn}
                      onClick={() => setFriendModal(prev => ({ ...prev, choiceIndex: i }))}
                    >{opt}</button>
                  ))}
                </div>
              ) : (
                <div style={{ ...styles.vnBubble, ...styles.vnBubbleRight }}>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>{friendMeta.name}</div>
                  <div>{vnTyping ? '.'.repeat((vnTypingTick||0)+1) : ((rawLine.responses && rawLine.responses[choiceIndex]) || '')}</div>
                </div>
              )}
            </div>
          )}
          {/* Gift modal for Griswald (Lv2): Worn Lyric Notebook */}
          {(grisGiftOpen && friendModal.targetLevel===2 && friendId==='griswald') && (
            <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.35)', borderRadius:12, padding:12, textAlign:'center', zIndex: 20, width: 360 }}>
              <div style={{ position:'relative', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop: 6, paddingBottom: 6 }}>
                <div style={{ position:'absolute', width:130, height:130, borderRadius:'50%', background:'radial-gradient(closest-side, rgba(255,230,150,0.35), rgba(255,255,255,0) 70%)', filter:'blur(1px)', pointerEvents:'none' }} />
                <img src={'/art/lyricnotebook.png'} alt={'Worn Lyric Notebook'} onError={(e)=>{ e.currentTarget.src='/art/notebook.png'; }} style={{ width: 96, height: 'auto', objectFit:'contain', filter:'drop-shadow(0 6px 14px rgba(0,0,0,.55))' }} />
              </div>
              <div style={{ ...styles.sub, marginTop: 4 }}>Griswald gifted you a Worn Lyric Notebook</div>
              <button style={{ ...styles.primaryBtn, marginTop: 10 }} onClick={()=> setGrisGiftOpen(false)}>OK</button>
            </div>
          )}

          {(lampGiftOpen && friendModal.targetLevel===2) && (
            <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.35)', borderRadius:12, padding:12, textAlign:'center', zIndex: 20, width: 360 }}>
              <div style={{ position:'relative', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop: 6, paddingBottom: 6 }}>
                <div style={{ position:'absolute', width:140, height:140, borderRadius:'50%', background:'radial-gradient(closest-side, rgba(190,160,255,0.35), rgba(255,255,255,0) 70%)', filter:'blur(1px)', pointerEvents:'none' }} />
                <img src={'/art/lavalamp.png'} alt={'Neon Dorm Lamp'} style={{ width: 96, height: 'auto', objectFit:'contain', filter:'drop-shadow(0 6px 14px rgba(0,0,0,.55))' }} />
              </div>
              <div style={{ ...styles.sub, marginTop: 4 }}>Lumina gifted you a neon dorm lamp</div>
              <button style={{ ...styles.primaryBtn, marginTop: 10 }} onClick={()=> setLampGiftOpen(false)}>OK</button>
            </div>
          )}
          {(midnightHazeGiftOpen && friendModal.targetLevel===4) && (
            <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.35)', borderRadius:12, padding:12, textAlign:'center', zIndex: 20, width: 360 }}>
              <div style={{ position:'relative', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop: 6, paddingBottom: 6 }}>
                <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(closest-side, rgba(200,120,255,0.30), rgba(255,255,255,0) 70%)', filter:'blur(1px)', pointerEvents:'none' }} />
                <div style={{ fontWeight: 800 }}>Gift Received</div>
              </div>
              <div style={{ ...styles.sub }}>Midnight Haze Lighting</div>
              <button style={{ ...styles.primaryBtn, marginTop: 10 }} onClick={()=> setMidnightHazeGiftOpen(false)}>OK</button>
            </div>
          )}

          {(polaroidGiftOpen && friendModal.targetLevel===5 && friendId==='griswald') && (
            <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.35)', borderRadius:12, padding:12, textAlign:'center', zIndex: 20, width: 380 }}>
              <div style={{ position:'relative', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop: 6, paddingBottom: 6 }}>
                <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'radial-gradient(closest-side, rgba(210,240,210,0.28), rgba(255,255,255,0) 70%)', filter:'blur(1px)', pointerEvents:'none' }} />
                <img src={'/art/forestpolaroid.png'} alt={'Polaroid Photograph'} style={{ width: 200, height: 'auto', objectFit:'contain', filter:'drop-shadow(0 6px 14px rgba(0,0,0,.55))' }} />
              </div>
              <div style={{ ...styles.sub, marginTop: 4 }}>Polaroid Photograph</div>
              <button style={{ ...styles.primaryBtn, marginTop: 10 }} onClick={()=> setPolaroidGiftOpen(false)}>OK</button>
            </div>
          )}

          {(rainGiftOpen && friendModal.targetLevel===4 && friendId==='griswald') && (
            <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', background:'rgba(0,0,0,.75)', border:'1px solid rgba(255,255,255,.35)', borderRadius:12, padding:12, textAlign:'center', zIndex: 20, width: 360 }}>
              <div style={{ position:'relative', width:'100%', display:'flex', alignItems:'center', justifyContent:'center', paddingTop: 6, paddingBottom: 6 }}>
                <div style={{ position:'absolute', width:150, height:150, borderRadius:'50%', background:'radial-gradient(closest-side, rgba(150,190,255,0.30), rgba(255,255,255,0) 70%)', filter:'blur(1px)', pointerEvents:'none' }} />
                <div style={{ fontWeight: 800 }}>Gift Received</div>
              </div>
              <div style={{ ...styles.sub }}>Rainfall Stage Lighting</div>
              <button style={{ ...styles.primaryBtn, marginTop: 10 }} onClick={()=> setRainGiftOpen(false)}>OK</button>
            </div>
          )}

          <div style={{ position:'absolute', right: 12, top: 12, display:'flex', gap:6 }}>
            {!(isChoiceStep && choiceIndex == null) && (
              <button
                style={styles.primaryBtn}
                onClick={() => {
                  const next = (friendModal.idx||0)+1;
                  if (isChoiceStep) {
                    if (choiceIndex == null) return;
                    if (next < lines.length) {
                      setFriendModal(prev => ({ ...prev, idx: next, choiceIndex: null }));
                    } else {
                      // Complete at end (choice path)
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
                        } catch { /* ignore */ }
                        setFriends(prev => ({ ...prev, luminaO: { ...prev.luminaO, rewardsClaimed: { ...(prev.luminaO.rewardsClaimed||{}), 5:true }, posterUnlocked:true } }));
                        pushToast('Lumina-O gift: +1 Bonus Roll and a new poster!');
                      }
                      if (friendId==='griswald' && friendModal.targetLevel === 2 && !(friends?.griswald?.rewardsClaimed?.[2])) {
                        if (typeof setWriting === 'function') {
                          setWriting(v => Math.max(0, Math.min(10, (v||0) + 0.2)));
                        }
                        setFriends(prev => ({ ...prev, griswald: { ...prev.griswald, rewardsClaimed: { ...(prev.griswald?.rewardsClaimed||{}), 2:true } } }));
                        pushToast('Griswald gift: Worn Lyric Notebook (+0.20 Writing)');
                      }
                      setFriendModal({ open:false, friendId:null, targetLevel:null, idx:0, choiceIndex: null });
                    }
                  } else if (next < lines.length) {
                    setFriendModal(prev => ({ ...prev, idx: next }));
                  } else {
                    // Complete at end (normal path)
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
                      } catch { /* ignore */ }
                      setFriends(prev => ({ ...prev, luminaO: { ...prev.luminaO, rewardsClaimed: { ...(prev.luminaO.rewardsClaimed||{}), 5:true }, posterUnlocked:true } }));
                      pushToast('Lumina-O gift: +1 Bonus Roll and a new poster!');
                    }
                    if (friendId==='griswald' && friendModal.targetLevel === 2 && !(friends?.griswald?.rewardsClaimed?.[2])) {
                      if (typeof setWriting === 'function') {
                        setWriting(v => Math.max(0, Math.min(10, (v||0) + 0.2)));
                      }
                      setFriends(prev => ({ ...prev, griswald: { ...prev.griswald, rewardsClaimed: { ...(prev.griswald?.rewardsClaimed||{}), 2:true } } }));
                      pushToast('Griswald gift: Worn Lyric Notebook (+0.20 Writing)');
                    }
                    setFriendModal({ open:false, friendId:null, targetLevel:null, idx:0, choiceIndex: null });
                  }
                }}
              >{isChoiceStep ? ((friendModal.idx||0) < lines.length-1 ? 'Next' : 'Finish') : ((friendModal.idx||0) < lines.length-1 ? 'Next' : 'Finish')}</button>
            )}
          </div>
        </Fragment>
      </div>
    </div>
  );
}
