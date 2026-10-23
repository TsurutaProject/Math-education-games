/** 音声素材を優先し、未配置・読み込み中・失敗時は合成音を使う。 */
let ctx: AudioContext | null = null;
let enabled = true;
let bgmEnabled = false;
let bgmVolume = 0.25;
let bgmSource: AudioBufferSourceNode | null = null;
let bgmGain: GainNode | null = null;
const buffers = new Map<string, AudioBuffer>();
const activeSounds = new Set<AudioBufferSourceNode>();
let loading = false;
const soundNames = ['shot', 'hit', 'hit-heavy', 'miss', 'sling', 'catapult', 'thud', 'clear', 'clear-big', 'out'];

async function loadAudio(name: string, folder: string) {
  for (const extension of ['mp3', 'ogg', 'wav']) {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${folder}/${name}.${extension}`);
      if (!response.ok || !ctx) continue;
      const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      buffers.set(name, buffer);
      if (name === 'game') syncBgm();
      return;
    } catch {
      // 未配置・非対応形式なら次の形式を試す。
    }
  }
}

function syncBgm() {
  if (!bgmEnabled || document.hidden) {
    bgmSource?.stop();
    bgmSource = null;
    bgmGain = null;
    return;
  }
  if (bgmGain) bgmGain.gain.value = bgmVolume;
  const buffer = buffers.get('game');
  if (bgmSource || !ctx || ctx.state !== 'running' || !buffer) return;
  bgmSource = ctx.createBufferSource();
  bgmGain = ctx.createGain();
  bgmSource.buffer = buffer;
  bgmSource.loop = true;
  bgmGain.gain.value = bgmVolume;
  bgmSource.connect(bgmGain).connect(ctx.destination);
  bgmSource.start();
}

export function setBgmSettings(on: boolean, volume: number) {
  bgmEnabled = on;
  bgmVolume = Math.max(0, Math.min(1, volume));
  syncBgm();
}

function playFile(name: string): boolean {
  if (!enabled || !ctx) return true;
  const buffer = buffers.get(name);
  if (!buffer) return false;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  activeSounds.add(source);
  source.onended = () => activeSounds.delete(source);
  source.start();
  return true;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) {
    activeSounds.forEach((source) => source.stop());
    activeSounds.clear();
  }
}

/** 最初のタッチ/クリックで呼ぶ（ブラウザは操作の後でないと音を出せない） */
export function unlockAudio() {
  try {
    if (!ctx) ctx = new AudioContext();
    if (!loading) {
      loading = true;
      soundNames.forEach((name) => { void loadAudio(name, 'sounds'); });
      void loadAudio('game', 'bgm');
      document.addEventListener('visibilitychange', syncBgm);
    }
    if (ctx.state === 'suspended') void ctx.resume().then(syncBgm).catch(() => {});
    else syncBgm();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; delay?: number } = {}) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + (opts.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
  g.gain.setValueAtTime(opts.gain ?? 0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.2, delay = 0, highpass = 800) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = highpass;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t0);
}

/** コルク銃の「ポン」 */
export function sfxShot() {
  if (playFile('shot')) return;
  noise(0.06, 0.25, 0, 1500);
  tone(320, 0.08, { to: 120, gain: 0.15 });
}

/** 当たった。heavy で手応えを厚く（C） */
export function sfxHit(heavy = false) {
  if (playFile(heavy && buffers.has('hit-heavy') ? 'hit-heavy' : 'hit')) return;
  tone(880, 0.09, { type: 'triangle', gain: 0.25, to: 520 });
  if (heavy) {
    tone(1320, 0.12, { type: 'square', gain: 0.06, delay: 0.03 });
    // 倒れる「コトン」
    tone(180, 0.18, { gain: 0.35, to: 70, delay: 0.32 });
    noise(0.08, 0.15, 0.32, 300);
  }
}

/** パチンコのゴムが戻る「ビョン」 */
export function sfxSling() {
  if (playFile('sling')) return;
  tone(180, 0.16, { type: 'triangle', gain: 0.22, to: 520 });
  noise(0.05, 0.08, 0, 2000);
}

/** カタパルトのうでが振れる「ギッ・ブン」 */
export function sfxCatapult() {
  if (playFile('catapult')) return;
  noise(0.06, 0.12, 0, 600);
  tone(140, 0.2, { type: 'sawtooth', gain: 0.08, to: 60 });
  tone(300, 0.18, { type: 'triangle', gain: 0.12, to: 700, delay: 0.05 });
}

/** カタパルトの弾が外れて地面に落ちた「ポスッ」 */
export function sfxThud() {
  if (playFile('thud')) return;
  noise(0.12, 0.18, 0, 200);
  tone(110, 0.15, { gain: 0.2, to: 50 });
}

export function sfxMiss() {
  if (playFile('miss')) return;
  noise(0.18, 0.08, 0, 3000);
}

export function sfxClear(big = false) {
  if (playFile(big && buffers.has('clear-big') ? 'clear-big' : 'clear')) return;
  const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
  notes.forEach((f, i) => tone(f, big ? 0.3 : 0.2, { type: 'triangle', gain: 0.2, delay: i * (big ? 0.11 : 0.09) }));
}

export function sfxOut() {
  if (playFile('out')) return;
  tone(440, 0.15, { type: 'triangle', gain: 0.15 });
  tone(392, 0.25, { type: 'triangle', gain: 0.15, delay: 0.15 });
}
