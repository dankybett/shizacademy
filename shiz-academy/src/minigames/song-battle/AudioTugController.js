// Simple two-track crossfade controller for the music tug-of-war.
// Phase 1: no tempo sync; equal-power crossfade driven by an advantage value.

export default class AudioTugController {
  constructor({ playerUrl, aiUrl, computeAdvantage }) {
    this.playerUrl = playerUrl;
    this.aiUrl = aiUrl;
    this.computeAdvantage = computeAdvantage || (() => 0);

    this.ctx = null;
    this.sources = null; // { player, ai }
    this.gains = null; // { player, ai }
    this.master = null;
    this.buffers = null; // { player, ai }
    this.lastGains = { player: 0, ai: 0 };

    this.started = false;
    this.unlocked = false;
    this.tickId = null;

    // Advantage smoothing + hysteresis
    this.advRaw = 0; // [-1,1]
    this.adv = 0; // smoothed
    this.alpha = 0.25;
    this.maxDelta = 0.08; // per tick clamp

    this.leader = 'ai'; // start with opponent audible by default
    this.lastFlipTs = 0;
    this.flipCooldownMs = 1000; // ignore chatter right after flip
    this.holdMs = 2500; // min hold time before flipping back
    this.switchThresh = 0.15;
    this.releaseThresh = 0.10;

    // Soft-knee near center to allow a quick 50/50 crossfade
    this.kneeBand = 0.08; // |adv| <= kneeBand => 50/50
    this.kneeRampMs = 150;
    this.kneeEnabled = false; // enable knee only after player has truly led
    this.hasPlayerLed = false;

    // Momentum: boosts advantage right after garbage is applied; decays over time
    this.momentum = 0; // added to advantage before decisions
    this.momentumPerRow = 0.08; // per garbage row effect
    this.momentumMax = 0.6;
    this.momentumTau = 2200; // ms decay time constant
    this.lastTickMs = performance.now();
    this.lastEventTs = performance.now(); // for knee restriction

    // Duck state
    this.duck = { player: 1, ai: 1 };
  }

  async init() {
    if (this.buffers) return; // already loaded
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Preload buffers (fetch/decode ok before unlock), with fallbacks
    const p = await this._loadWithFallback(this.playerUrl, '/art/music/player.mp3');
    const a = await this._loadWithFallback(this.aiUrl, '/art/music/ai.mp3');
    this.buffers = { player: p, ai: a };
  }

  async unlockAndStart() {
    if (!this.ctx) {
      await this.init();
    }
    if (this.unlocked) return;
    try { await this.ctx.resume(); } catch (e) { console.warn('Audio resume failed', e); }
    this.unlocked = true;
    // Ensure buffers are present; if not, try to (re)load
    if (!this.buffers) {
      try { await this.init(); } catch (e) { console.error('Audio init/load failed', e); }
    }
    if (!this.started) this._startGraph();
  }

  _startGraph() {
    if (!this.buffers || !this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.05;

    const player = ctx.createBufferSource();
    player.buffer = this.buffers.player; player.loop = true;
    const ai = ctx.createBufferSource();
    ai.buffer = this.buffers.ai; ai.loop = true;

    const gPlayer = ctx.createGain(); gPlayer.gain.setValueAtTime(0.0, now);
    const gAI = ctx.createGain(); gAI.gain.setValueAtTime(0.0, now);
    const master = ctx.createGain(); master.gain.setValueAtTime(1.0, now);

    player.connect(gPlayer).connect(master).connect(ctx.destination);
    ai.connect(gAI).connect(master);

    player.start(now);
    ai.start(now);

    this.sources = { player, ai };
    this.gains = { player: gPlayer, ai: gAI };
    this.master = master;
    this.started = true;

    // Intro: opponent audible until player pulls ahead
    this._ramp(this.gains.player.gain, 0.0, now + 0.02, 0.35);
    this._ramp(this.gains.ai.gain, 1.0, now + 0.02, 0.35);

    // Start tick
    this._startTick();
  }

  _startTick() {
    if (this.tickId) return;
    this.tickId = setInterval(() => this._tick(), 80); // ~12.5 Hz
  }

  _tick() {
    if (!this.started || !this.gains) return;
    // 0) Time delta for momentum decay
    const msNow = performance.now();
    const dt = Math.max(0, msNow - this.lastTickMs);
    this.lastTickMs = msNow;
    // Decay momentum
    const decay = Math.exp(-dt / this.momentumTau);
    this.momentum *= decay;

    // 1) Read raw advantage ([-1,1])
    const raw = this._clamp(this.computeAdvantage(), -1, 1);
    // 2) EMA smooth + clamp delta
    const target = this.adv + this.alpha * (raw - this.adv);
    const clamped = this._clamp(target, this.adv - this.maxDelta, this.adv + this.maxDelta);
    this.adv = clamped;

    // Compose effective advantage with momentum
    const advEff = this._clamp(this.adv + this.momentum, -1, 1);

    // 3) Hysteresis logic for accent/flip speed (keeps feel consistent)
    const prevLeader = this.leader;
    const now = this.ctx.currentTime;
    const canFlipByTime = (msNow - this.lastFlipTs) > Math.max(this.flipCooldownMs, this.holdMs);
    const shouldBe = advEff > this.switchThresh ? 'player' : advEff < -this.switchThresh ? 'ai' : null;
    const releaseOk = (this.leader === 'player' && advEff < this.releaseThresh) || (this.leader === 'ai' && advEff > -this.releaseThresh) || this.leader == null;
    if (shouldBe && (this.leader !== shouldBe) && releaseOk && canFlipByTime) {
      this.leader = shouldBe; this.lastFlipTs = msNow;
      if (shouldBe === 'player') { this.hasPlayerLed = true; this.kneeEnabled = true; }
    }

    // 4) Map to exclusive gains with a soft-knee 50/50 zone near center
    let gP = 0, gA = 0;
    const calmEnough = (msNow - this.lastEventTs) > 1000 || this.leader == null;
    const nearCenter = this.kneeEnabled && calmEnough && Math.abs(advEff) <= this.kneeBand;
    if (nearCenter) {
      gP = 0.5; gA = 0.5; // quick shared mix
    } else if (this.leader === 'player' || (this.leader == null && advEff >= 0)) {
      gP = 1.0; gA = 0.0;
    } else {
      gP = 0.0; gA = 1.0;
    }

    // apply ducking multipliers
    gP *= this.duck.player;
    gA *= this.duck.ai;

    const rampMs = nearCenter ? this.kneeRampMs : ((prevLeader && this.leader && prevLeader !== this.leader) ? 260 : 450);
    this._ramp(this.gains.player.gain, gP, now + 0.01, rampMs / 1000);
    this._ramp(this.gains.ai.gain, gA, now + 0.01, rampMs / 1000);
    this.lastGains = { player: gP, ai: gA };

    // decay duck back to 1.0 gently
    this.duck.player = Math.min(1, this.duck.player + 0.06);
    this.duck.ai = Math.min(1, this.duck.ai + 0.06);
  }

  onClear(side, kind = 'line') {
    // side: 'player' | 'ai' who cleared; we duck the opponent
    const amt = kind === 'tetris' ? 0.5 : 0.7; // 0.7 ~ -3dB, 0.5 ~ -6dB
    if (side === 'player') this.duck.ai = Math.min(this.duck.ai, amt);
    else this.duck.player = Math.min(this.duck.player, amt);
    this.lastEventTs = performance.now();
  }

  onGarbageApplied(side, amount = 0) {
    // side: 'player' | 'ai' who RECEIVED garbage. Momentum favors the opponent of 'side'.
    const sign = side === 'ai' ? +1 : -1; // if AI got hit, boost player
    const add = sign * this.momentumPerRow * Math.max(0, Number(amount || 0));
    this.momentum = this._clamp(this.momentum + add, -this.momentumMax, this.momentumMax);
    this.lastEventTs = performance.now();
  }

  onGameOver(winner) {
    if (!this.gains || !this.ctx) return;
    const now = this.ctx.currentTime;
    const w = winner === 'player' ? this.gains.player.gain : this.gains.ai.gain;
    const l = winner === 'player' ? this.gains.ai.gain : this.gains.player.gain;
    this._ramp(w, 1.0, now + 0.01, 0.3);
    this._ramp(l, 0.0, now + 0.01, 0.25);
  }

  pause() {
    // just lower gains quickly (keep context running)
    if (!this.gains || !this.ctx) return;
    const now = this.ctx.currentTime;
    this._ramp(this.gains.player.gain, 0.0, now + 0.01, 0.15);
    this._ramp(this.gains.ai.gain, 0.0, now + 0.01, 0.15);
  }

  resume() {
    // let tick set targets next frame, but fade in a bit
    if (!this.gains || !this.ctx) return;
    const now = this.ctx.currentTime;
    this._ramp(this.gains.player.gain, 0.4, now + 0.01, 0.25);
    this._ramp(this.gains.ai.gain, 0.4, now + 0.01, 0.25);
  }

  destroy() {
    try { if (this.tickId) clearInterval(this.tickId); } catch (_) {}
    this.tickId = null;
    try { this.sources && this.sources.player && this.sources.player.stop(); } catch (_) {}
    try { this.sources && this.sources.ai && this.sources.ai.stop(); } catch (_) {}
    this.sources = null; this.gains = null; this.master = null; this.buffers = null;
    try { this.ctx && this.ctx.close && this.ctx.close(); } catch (_) {}
    this.ctx = null; this.started = false; this.unlocked = false;
  }

  // Utils
  async _loadBuffer(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    const arr = await res.arrayBuffer();
    return await this.ctx.decodeAudioData(arr);
  }

  async _loadWithFallback(primaryUrl, fallbackUrl) {
    try {
      return await this._loadBuffer(primaryUrl);
    } catch (e) {
      try {
        return await this._loadBuffer(fallbackUrl);
      } catch (e2) {
        // As a last resort, rethrow the original error to surface in console
        console.error('Audio load failed for both primary and fallback', { primaryUrl, fallbackUrl, e, e2 });
        throw e;
      }
    }
  }

  _ramp(param, target, when, dur) {
    try {
      param.cancelScheduledValues(0);
      const cur = param.value;
      param.setValueAtTime(cur, when);
      param.linearRampToValueAtTime(target, when + dur);
    } catch (_) {}
  }

  _clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  getDebug() {
    return {
      adv: this.adv,
      momentum: this.momentum,
      leader: this.leader,
      gains: { ...this.lastGains },
    };
  }
}
