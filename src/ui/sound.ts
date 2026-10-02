/** Web Audio で作る簡単な効果音。外部の音声ファイルは使わない。 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/** 最初のタッチ/クリックで呼ぶ（ブラウザは操作の後でないと音を出せない） */
export function unlockAudio() {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
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
  noise(0.06, 0.25, 0, 1500);
  tone(320, 0.08, { to: 120, gain: 0.15 });
}

/** 当たった。heavy で手応えを厚く（C） */
export function sfxHit(heavy = false) {
  tone(880, 0.09, { type: 'triangle', gain: 0.25, to: 520 });
  if (heavy) {
    tone(1320, 0.12, { type: 'square', gain: 0.06, delay: 0.03 });
    // 倒れる「コトン」
    tone(180, 0.18, { gain: 0.35, to: 70, delay: 0.32 });
    noise(0.08, 0.15, 0.32, 300);
  }
}

export function sfxMiss() {
  noise(0.18, 0.08, 0, 3000);
}

export function sfxClear(big = false) {
  const notes = big ? [523, 659, 784, 1047, 1319] : [523, 659, 784];
  notes.forEach((f, i) => tone(f, big ? 0.3 : 0.2, { type: 'triangle', gain: 0.2, delay: i * (big ? 0.11 : 0.09) }));
}

export function sfxOut() {
  tone(440, 0.15, { type: 'triangle', gain: 0.15 });
  tone(392, 0.25, { type: 'triangle', gain: 0.15, delay: 0.15 });
}
