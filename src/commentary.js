// commentary.js — spoken commentary using the browser's speech synthesis (free, no network account needed).
// Picks the most natural English voice the device offers and speaks short broadcast-style lines.
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
const C = { on: true, voice: null, queue: [], busy: false, lastAt: 0 };

// Preference order: natural/neural voices first, then regional English accents common in cricket broadcasting.
const PREFER = [/natural|neural|online/i, /en-GB|en_GB|UK English/i, /en-AU|en_AU|Australia/i, /en-IN|en_IN|India|Rishi/i, /Daniel|Arthur|Oliver|Thomas|Ryan|Guy|Google UK English Male/i, /^en/i];
function pickVoice() {
  if (!synth) return null;
  const vs = synth.getVoices().filter(v => /^en/i.test(v.lang));
  if (!vs.length) return null;
  let best = null, score = -1;
  for (const v of vs) {
    let s = 0;
    PREFER.forEach((re, i) => { if (re.test(v.name) || re.test(v.lang)) s += (PREFER.length - i) * 2; });
    if (/female|zira|samantha|susan|hazel|karen|moira|tessa|veena/i.test(v.name)) s -= 3;   // a male lead commentator by default
    if (s > score) { score = s; best = v; }
  }
  return best;
}
if (synth) { C.voice = pickVoice(); synth.onvoiceschanged = () => { C.voice = pickVoice(); }; }

// Remove symbols the voice would read out awkwardly.
function clean(t) {
  return String(t).replace(/\bkm\/h\b/g, 'kilometres an hour').replace(/(\d+)\/(\d+)/g, '$1 for $2')
    .replace(/[•·]/g, ',').replace(/\s+/g, ' ').trim();
}

// priority: 2 = result of the ball (cuts off anything still talking), 1 = normal, 0 = filler (skipped if busy)
function say(text, priority = 1, opts = {}) {
  if (!synth || !C.on || !text) return;
  if (priority === 0 && (synth.speaking || synth.pending)) return;
  if (priority >= 2) synth.cancel();
  const u = new SpeechSynthesisUtterance(clean(text));
  if (C.voice) u.voice = C.voice;
  u.lang = (C.voice && C.voice.lang) || 'en-GB';
  u.rate = opts.rate || 1.06; u.pitch = opts.pitch || .95; u.volume = opts.volume ?? 1;
  try { synth.speak(u); } catch (e) { /* speech not allowed here */ }
}
function setCommentary(on) { C.on = on; if (!on && synth) synth.cancel(); }
function stopCommentary() { if (synth) synth.cancel(); }
const commentaryAvailable = !!synth;

// ---- line builders for moments the text commentary does not cover
const pick = a => a[Math.floor(Math.random() * a.length)];
function runupLine(bowler, M) {
  const name = bowler.name.split(' ').pop();
  if (M && M.balls === 0 && !M.overLog.length) return pick([`${name} to open the bowling.`, `${name} has the new ball.`]);
  if (M && M.freeHit) return 'Free hit coming up.';
  const need = M ? M.target - M.runs : 0, left = M ? M.mode.overs * 6 - M.balls : 0;
  if (M && !M.mode.nets && left <= 6 && need > 0 && need < 40) return pick([`${need} needed off ${left}.`, `${need} to win, ${left} balls left.`]);
  return Math.random() < .55 ? pick([`${name} runs in.`, `In comes ${name}.`, `${name}, in to bowl.`, `Here's ${name}.`]) : '';
}

export { say, setCommentary, stopCommentary, commentaryAvailable, runupLine };
