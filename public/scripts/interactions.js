// Kept in sync with claude_shift/renderer/renderer.js's GEARS percentage table
// (rpmDeg values ported verbatim from the real app's needle rotation).
const GEARS = [
  { key: 'haiku',    num: '1', label: 'Haiku',      x: 31.7, y: 21.8, rpmDeg: -55 },
  { key: 'sonnet',   num: '2', label: 'Sonnet',     x: 31.7, y: 78.2, rpmDeg: -20 },
  { key: 'sonnet1m', num: '3', label: 'Sonnet 1M',  x: 50,   y: 21.8, rpmDeg: 5   },
  { key: 'opus',     num: '4', label: 'Opus',       x: 50,   y: 78.2, rpmDeg: 40  },
  { key: 'fable',    num: '5', label: 'Fable',      x: 68.3, y: 21.8, rpmDeg: 85  },
  { key: 'default',  num: 'R', label: 'Default',    x: 68.3, y: 78.2, rpmDeg: -40 },
];

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Nav glass-on-scroll ---------- */
const nav = document.querySelector('[data-nav]');
if (nav) {
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- Live GitHub star count ---------- */
const starEls = document.querySelectorAll('[data-star-count]');
if (starEls.length) {
  fetch('https://api.github.com/repos/Sikorsky3301/-Claude-Model-Shifter')
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((data) => {
      const count = data.stargazers_count;
      if (typeof count === 'number') {
        const label = count === 1 ? 'Star' : 'Stars';
        starEls.forEach((el) => { el.textContent = `${count} ${label} on GitHub`; });
      }
    })
    .catch(() => {}); // keep the static "Star on GitHub" fallback text on any failure
}

/* ---------- Cursor-tracking hero spotlight ---------- */
const spotlight = document.querySelector('[data-spotlight]');
if (spotlight && !reduceMotion) {
  const heroEl = spotlight.closest('.hero');
  heroEl.addEventListener('pointermove', (e) => {
    const r = heroEl.getBoundingClientRect();
    spotlight.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
    spotlight.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
  });
}

/* ---------- Scroll-reveal ---------- */
const revealEls = document.querySelectorAll('[data-reveal]');
if (revealEls.length) {
  revealEls.forEach((el, i) => el.style.setProperty('--i', i % 6));
  if (reduceMotion) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  }
}

/* ---------- Pointermove tilt ---------- */
if (!reduceMotion) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    const strength = 8;
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty('--ry', `${px * strength * 2}deg`);
      card.style.setProperty('--rx', `${-py * strength * 2}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------- How-it-works: fill rail as steps enter view ---------- */
document.querySelectorAll('[data-step]').forEach((step, i) => {
  step.style.setProperty('--i', i);
});
const stepEls = document.querySelectorAll('[data-step]');
if (stepEls.length) {
  if (reduceMotion) {
    stepEls.forEach((el) => el.classList.add('active'));
  } else {
    const stepIo = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('active');
      }),
      { threshold: 0.4 }
    );
    stepEls.forEach((el) => stepIo.observe(el));
  }
}

/* ---------- Dashboard replica: shared knob/gauge driver ---------- */
function wireDashboard(root, { autoplay }) {
  if (!root) return;
  const stage = root.querySelector('[data-stage]');
  const knob = root.querySelector('[data-knob]');
  const needle = root.querySelector('[data-needle]');
  const gearNum = root.querySelector('[data-gear-num]');
  const gearLabel = root.querySelector('[data-gear-label]');
  const cmdLine = root.querySelector('[data-cmd]');
  const buttons = root.querySelectorAll('[data-gbtn]');

  const NEUTRAL = { key: 'neutral', num: 'N', label: 'Neutral', x: 50, y: 50, rpmDeg: -90 };
  // Gate column/row positions -- must match the SVG rail geometry in DashboardMockup.astro.
  const COLS = [31.7, 50, 68.3];
  const ROW_TOP = 21.8, ROW_MID = 50, ROW_BOT = 78.2;
  const RAIL_BAND = 11; // how close to the neutral rail counts as "on it" (%)

  function setGear(gear) {
    if (knob) {
      knob.style.left = gear.x + '%';
      knob.style.top = gear.y + '%';
    }
    if (needle) needle.style.transform = `rotate(${gear.rpmDeg}deg)`;
    if (gearNum) gearNum.textContent = gear.num;
    if (gearLabel) gearLabel.textContent = gear.label.toUpperCase();
    if (cmdLine) cmdLine.textContent = gear.key === 'neutral' ? ' ' : `/model ${gear.key}`;
    buttons.forEach((b) => b.classList.toggle('active', b.dataset.gbtn === gear.key));
  }

  function playSeat() {
    if (!knob || reduceMotion) return;
    knob.classList.remove('seating');
    void knob.offsetWidth; // restart the animation
    knob.classList.add('seating');
  }
  knob?.addEventListener('animationend', () => knob.classList.remove('seating'));

  function engage(gear) {
    setGear(gear);
    playSeat();
    if (gear.key !== 'neutral') playGearSound(gear.key);
  }

  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      const gear = GEARS.find((g) => g.key === b.dataset.gbtn);
      if (gear) engage(gear);
    });
  });

  /* ---------- Draggable knob, constrained to the H-pattern rails ---------- */
  let autoplayTimer = null;
  if (knob && stage) {
    let dragging = false;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const nearestCol = (x) => COLS.reduce((best, c) => (Math.abs(c - x) < Math.abs(best - x) ? c : best), COLS[0]);

    function stagePercent(evt) {
      const r = stage.getBoundingClientRect();
      return {
        x: clamp(((evt.clientX - r.left) / r.width) * 100, 8, 92),
        y: clamp(((evt.clientY - r.top) / r.height) * 100, 10, 90),
      };
    }

    function constrain(p) {
      if (Math.abs(p.y - ROW_MID) < RAIL_BAND) {
        return { x: clamp(p.x, COLS[0], COLS[2]), y: ROW_MID };
      }
      return { x: nearestCol(p.x), y: clamp(p.y, ROW_TOP, ROW_BOT) };
    }

    function nearestGate(p) {
      let best = NEUTRAL, bestD = Infinity;
      for (const g of [...GEARS, NEUTRAL]) {
        const d = (g.x - p.x) ** 2 + (g.y - p.y) ** 2;
        if (d < bestD) { bestD = d; best = g; }
      }
      return best;
    }

    knob.addEventListener('pointerdown', (e) => {
      dragging = true;
      knob.classList.add('dragging');
      knob.setPointerCapture(e.pointerId);
      if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
      e.preventDefault();
    });
    knob.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const p = constrain(stagePercent(e));
      knob.style.left = p.x + '%';
      knob.style.top = p.y + '%';
    });
    knob.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      knob.classList.remove('dragging');
      engage(nearestGate(constrain(stagePercent(e))));
    });
    knob.addEventListener('pointercancel', () => {
      if (!dragging) return;
      dragging = false;
      knob.classList.remove('dragging');
      engage(NEUTRAL);
    });
  }

  if (autoplay && !reduceMotion) {
    let i = 0;
    setGear(GEARS[0]);
    autoplayTimer = setInterval(() => {
      i = (i + 1) % GEARS.length;
      setGear(GEARS[i]);
    }, 1800);
  } else {
    setGear(GEARS[0]);
  }
}

/* ---------- Optional click-to-play gear sounds (showcase only) ---------- */
const soundCache = {};
function getSound(key) {
  const file = key === 'opus' ? 'opus.mp3'
    : key === 'fable' ? 'fable-acceleration.wav'
    : 'gear-shift.wav';
  if (!soundCache[file]) {
    const a = new Audio(`/sounds/${file}`);
    a.volume = 0.35;
    soundCache[file] = a;
  }
  return soundCache[file];
}
let soundEnabled = true;
function playGearSound(key) {
  if (!soundEnabled) return;
  const sound = getSound(key);
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

const muteToggle = document.querySelector('[data-mute-toggle]');
if (muteToggle) {
  muteToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    muteToggle.classList.toggle('muted', !soundEnabled);
    muteToggle.setAttribute('aria-pressed', String(!soundEnabled));
  });
}

wireDashboard(document.querySelector('[data-dashboard="hero"]'), { autoplay: true });
wireDashboard(document.querySelector('[data-dashboard="showcase"]'), { autoplay: false });
