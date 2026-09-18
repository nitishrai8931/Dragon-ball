/* =========================================================
   身勝手の極意 — ULTRA INSTINCT
   frames 001-070 : scroll-scrubbed transformation
   frames 070-098 : cursor-driven head turn (mirrored for the
                    opposite side, since the source footage
                    only turns one way)
   ========================================================= */

const TOTAL     = 140;
const T_START   = 1,  T_END = 70;     // transformation range
const L_NEUTRAL = 70, L_MAX = 98;     // look range (70 = front, 98 = profile)
const FLASH_MS  = 2000;               // thunder interval

const cv      = document.getElementById('goku');
const ctx     = cv.getContext('2d');
const bolts   = document.getElementById('bolts');
const bctx    = bolts.getContext('2d');
const flash   = document.getElementById('flash');
const loader  = document.getElementById('loader');
const loFill  = document.getElementById('lo-fill');
const loPct   = document.getElementById('lo-pct');
const hint    = document.getElementById('hint');
const trackH  = document.getElementById('track-hint');
const copy    = document.getElementById('copy');
const awaken  = document.getElementById('awaken');
const hudForm = document.getElementById('hud-form');
const hudPow  = document.getElementById('hud-power');
const hudMet  = document.getElementById('hud-meter');
const scroller= document.getElementById('scroller');

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const pad   = n => String(n).padStart(3, '0');

/* ---------------------------------------------------------
   preload
   --------------------------------------------------------- */
const imgs = new Array(TOTAL + 1);
let loaded = 0;

function preload(){
  for (let i = 1; i <= TOTAL; i++){
    const im = new Image();
    im.decoding = 'async';
    im.onload = im.onerror = () => {
      loaded++;
      const p = loaded / TOTAL;
      loFill.style.width = (p * 100).toFixed(1) + '%';
      loPct.textContent = Math.round(p * 100);
      if (loaded === TOTAL) start();
    };
    im.src = 'frames/f' + pad(i) + '.webp';
    imgs[i] = im;
  }
}

/* ---------------------------------------------------------
   state
   --------------------------------------------------------- */
let scrollP     = 0;   // 0..1 transformation progress
let curFrame    = 1;   // smoothed frame index
let targetFrame = 1;
let mirror      = 1;   // smoothed flip, sign decides the direction
let mouseNX     = 0;   // -1 (left edge) .. 1 (right edge)
let mouseNY     = 0;
let smNX = 0, smNY = 0;
let transformed = false;
let burstDone   = false;

/* ---------------------------------------------------------
   sizing — the frame canvas is fixed 960x540 + object-fit:cover,
   the bolt canvas matches the viewport
   --------------------------------------------------------- */
function size(){
  const dpr = Math.min(devicePixelRatio || 1, 2);
  bolts.width  = Math.round(innerWidth  * dpr);
  bolts.height = Math.round(innerHeight * dpr);
  bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener('resize', size);

/* ---------------------------------------------------------
   scroll -> transformation
   --------------------------------------------------------- */
function readScroll(){
  const max = document.documentElement.scrollHeight - innerHeight;
  scrollP = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
}
addEventListener('scroll', readScroll, { passive: true });

/* ---------------------------------------------------------
   pointer -> head turn
   --------------------------------------------------------- */
function onMove(x, y){
  mouseNX = clamp((x / innerWidth  - .5) * 2, -1, 1);
  mouseNY = clamp((y / innerHeight - .5) * 2, -1, 1);
}
addEventListener('mousemove', e => onMove(e.clientX, e.clientY), { passive: true });
addEventListener('touchmove', e => {
  const t = e.touches[0];
  if (t) onMove(t.clientX, t.clientY);
}, { passive: true });

/* ---------------------------------------------------------
   thunder
   --------------------------------------------------------- */
function bolt(x0, y0, x1, y1, spread, depth){
  if (depth <= 0){
    bctx.moveTo(x0, y0);
    bctx.lineTo(x1, y1);
    return;
  }
  const mx = (x0 + x1) / 2 + (Math.random() - .5) * spread;
  const my = (y0 + y1) / 2 + (Math.random() - .5) * spread * .35;
  bolt(x0, y0, mx, my, spread * .55, depth - 1);
  bolt(mx, my, x1, y1, spread * .55, depth - 1);
  if (depth > 2 && Math.random() < .45){                      // branch
    bolt(mx, my,
         mx + (Math.random() - .5) * spread * 1.6,
         my + Math.random() * spread * .9,
         spread * .4, depth - 2);
  }
}

function strike(){
  const W = innerWidth, H = innerHeight;
  bctx.clearRect(0, 0, W, H);
  const n = 2 + Math.floor(Math.random() * 3);

  bctx.lineCap = 'round';
  for (let i = 0; i < n; i++){
    const x = Math.random() * W;
    bctx.beginPath();
    bolt(x, -30, x + (Math.random() - .5) * W * .5, H + 30, W * .22, 6);
    bctx.strokeStyle = 'rgba(58,168,255,.55)';   // glow pass
    bctx.lineWidth   = 7;
    bctx.shadowColor = '#3aa8ff';
    bctx.shadowBlur  = 34;
    bctx.stroke();
    bctx.strokeStyle = 'rgba(255,255,255,.95)';  // core pass
    bctx.lineWidth   = 1.6;
    bctx.shadowColor = '#eafaff';
    bctx.shadowBlur  = 10;
    bctx.stroke();
  }
  bctx.shadowBlur = 0;

  // full-screen flash, stronger once he is transformed
  flash.style.transition = 'none';
  flash.style.opacity = transformed ? .5 : .24;
  bolts.style.transition = 'none';
  bolts.style.opacity = 1;
  requestAnimationFrame(() => {
    flash.style.transition = 'opacity .42s ease-out';
    flash.style.opacity = 0;
    bolts.style.transition = 'opacity .3s ease-out';
    bolts.style.opacity = 0;
  });
  setTimeout(() => bctx.clearRect(0, 0, innerWidth, innerHeight), 480);
}

/* ---------------------------------------------------------
   render loop
   --------------------------------------------------------- */
function draw(){
  if (scrollP < 1){
    transformed = false;
    targetFrame = lerp(T_START, T_END, scrollP);
  } else {
    transformed = true;
    // distance from centre drives how far the head turns
    targetFrame = lerp(L_NEUTRAL, L_MAX, Math.abs(smNX));
  }

  curFrame = lerp(curFrame, targetFrame, transformed ? .16 : .3);
  smNX = lerp(smNX, mouseNX, .08);
  smNY = lerp(smNY, mouseNY, .08);

  const im = imgs[clamp(Math.round(curFrame), 1, TOTAL)];
  if (im && im.complete && im.naturalWidth){
    ctx.drawImage(im, 0, 0, cv.width, cv.height);
  }

  // flip so he can look BOTH ways from one-sided source frames
  mirror = lerp(mirror, smNX > 0 ? -1 : 1, .2);
  const flipX = mirror >= 0 ? 1 : -1;

  const t       = performance.now() / 1000;
  const breathe = transformed ? 1 + Math.sin(t * 1.5) * .006 : 1;
  const zoom    = lerp(1.04, 1.1, scrollP) * breathe;
  const px      = -smNX * 14;
  const py      = -smNY * 10;

  cv.style.transform =
    'translate3d(' + px.toFixed(2) + 'px,' + py.toFixed(2) + 'px,0) ' +
    'scale(' + (zoom * flipX).toFixed(4) + ',' + zoom.toFixed(4) + ')';

  cv.style.filter =
    'saturate(' + lerp(1, 1.18, scrollP).toFixed(3) + ') ' +
    'brightness(' + lerp(.92, 1.06, scrollP).toFixed(3) + ') ' +
    'contrast(' + lerp(1, 1.1, scrollP).toFixed(3) + ')';

  // ---- UI
  const pow = scrollP * 100;
  hudPow.textContent = pow.toFixed(1) + '%';
  hudMet.style.width = pow + '%';
  hudForm.textContent =
    scrollP < .22 ? '基本形態' :
    scrollP < .55 ? '気の高まり' :
    scrollP < .92 ? '極意「兆」' : '身勝手の極意';

  document.body.classList.toggle('ui-hot', scrollP > .6);
  hint.classList.toggle('gone', scrollP > .04);
  copy.classList.toggle('on', scrollP > .88);
  trackH.classList.toggle('on', transformed);

  if (transformed && !burstDone){
    burstDone = true;
    awaken.classList.add('hit');
    strike();
  } else if (!transformed && burstDone && scrollP < .9){
    burstDone = false;
    awaken.classList.remove('hit');
  }

  requestAnimationFrame(draw);
}

/* ---------------------------------------------------------
   go
   --------------------------------------------------------- */
function start(){
  size();
  readScroll();
  loader.classList.add('gone');
  ctx.imageSmoothingQuality = 'high';
  requestAnimationFrame(draw);
  if (!reduce){
    setTimeout(strike, 700);
    setInterval(strike, FLASH_MS);
  }
}

// scroll runway: long enough for a readable 70-frame scrub
scroller.style.height = '340vh';
preload();
