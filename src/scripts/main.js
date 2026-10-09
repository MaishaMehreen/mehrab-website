// All site interactions. Runs once, then re-initialises on every page
// (Astro View Transitions swap pages without a full reload).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'power3.out';

let lenis = null;
let cleanups = [];
let navigated = false;
window.__animStarted = true;

/* ---------------- Smooth scrolling ---------------- */
function startLenis() {
  if (reduced) return;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
}
gsap.ticker.add((t) => lenis && lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

/* ---------------- Page wipe between pages ---------------- */
const wipeIn = (el) =>
  el.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], {
    duration: 420, easing: 'cubic-bezier(.75,0,.2,1)', fill: 'forwards',
  }).finished;

document.addEventListener('astro:before-preparation', (e) => {
  closeMenu();
  const wipe = document.querySelector('.wipe');
  if (reduced || !wipe) return;
  const load = e.loader;
  e.loader = async () => {
    await Promise.all([load(), wipeIn(wipe).then(() => { wipe.style.transform = 'translateY(0)'; })]);
  };
});

document.addEventListener('astro:after-swap', () => {
  navigated = true;
  if (!reduced) root.classList.add('anim');
  const wipe = document.querySelector('.wipe');
  if (reduced || !wipe) return;
  wipe.getAnimations().forEach((a) => a.cancel());
  wipe.style.transform = 'translateY(0)';
  const a = wipe.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }], {
    duration: 620, delay: 60, easing: 'cubic-bezier(.75,0,.2,1)', fill: 'forwards',
  });
  a.finished.then(() => { a.cancel(); wipe.style.transform = 'translateY(100%)'; });
});

/* ---------------- Branded intro (home, first visit per session) ---------------- */
function playIntro() {
  const intro = document.querySelector('.intro');
  let seen = false;
  try { seen = sessionStorage.getItem('introSeen') === '1'; } catch {}
  if (!intro || reduced || navigated || seen) { root.classList.remove('intro-on'); return 0; }
  try { sessionStorage.setItem('introSeen', '1'); } catch {}
  root.classList.add('intro-on');
  const name = intro.querySelector('.disp');
  gsap.timeline({ onComplete: () => root.classList.remove('intro-on') })
    .fromTo(name, { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: EASE }, 0.05)
    .to(intro, { yPercent: -101, duration: 0.6, ease: 'power4.inOut' }, 0.8)
    .set(intro, { clearProps: 'transform' });
  return 1.1; // hero starts as the wipe lifts; everything done < 1.5s
}

/* ---------------- Hero lines + fades ---------------- */
function heroIn(delay) {
  const lines = gsap.utils.toArray('.rise > span');
  const fades = gsap.utils.toArray('[data-fade]');
  if (!lines.length && !fades.length) return;
  const tl = gsap.timeline({ delay });
  if (lines.length) tl.fromTo(lines, { yPercent: 105 }, {
    yPercent: 0, duration: 1, ease: EASE, stagger: 0.12,
    onComplete: () => lines.forEach((l) => { l.parentElement.classList.add('is-in'); gsap.set(l, { clearProps: 'transform' }); }),
  }, 0);
  if (fades.length) tl.fromTo(fades, { opacity: 0, y: 18 }, {
    opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.06,
    onComplete: () => fades.forEach((f) => { f.classList.add('is-in'); gsap.set(f, { clearProps: 'transform,opacity' }); }),
  }, 0.3);
}

/* ---------------- Word-by-word headline split ---------------- */
function splitWords(el) {
  if (el.dataset.splitDone) return el.querySelectorAll('.split-word');
  const walk = (node) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
          const mask = document.createElement('span');
          mask.className = 'split-mask';
          const word = document.createElement('span');
          word.className = 'split-word';
          word.textContent = p;
          mask.appendChild(word);
          frag.appendChild(mask);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') {
        walk(n);
      }
    });
  };
  el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  walk(el);
  el.dataset.splitDone = '1';
  return el.querySelectorAll('.split-word');
}

function initSplits() {
  gsap.utils.toArray('[data-split]').forEach((el) => {
    const words = splitWords(el);
    gsap.set(el, { visibility: 'visible' });
    gsap.fromTo(words, { yPercent: 110 }, {
      yPercent: 0, duration: 0.9, ease: EASE, stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
}

/* ---------------- Scroll reveals (staggered) ---------------- */
function initReveals() {
  const els = gsap.utils.toArray('[data-reveal]');
  if (!els.length) return;
  ScrollTrigger.batch(els, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.fromTo(batch, { opacity: 0, y: 48 }, {
      opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.1,
      onComplete: () => batch.forEach((b) => { b.classList.add('is-in'); gsap.set(b, { clearProps: 'transform,opacity' }); }),
    }),
  });
}

/* ---------------- Count-up numbers ---------------- */
function initCounts() {
  gsap.utils.toArray('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const obj = { v: 0 };
    el.textContent = (0).toFixed(dec);
    gsap.to(obj, {
      v: end, duration: 1.6, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => { el.textContent = dec ? obj.v.toFixed(dec) : Math.round(obj.v).toLocaleString('en-US'); },
    });
  });
}

/* ---------------- Marquee (speeds up with scroll) ---------------- */
function initMarquee() {
  const m = document.querySelector('.marq');
  if (!m) return;
  const tween = gsap.to(m, { xPercent: -50, duration: 26, ease: 'none', repeat: -1 });
  const st = ScrollTrigger.create({
    onUpdate: (self) => {
      const v = Math.min(Math.abs(self.getVelocity()) / 400, 4);
      gsap.to(tween, { timeScale: 1 + v, duration: 0.2, overwrite: true });
      gsap.to(tween, { timeScale: 1, duration: 1, delay: 0.2 });
    },
  });
  cleanups.push(() => { tween.kill(); st.kill(); });
}

/* ---------------- Hero showreel: slow zoom + parallax ---------------- */
function initHero() {
  const media = document.querySelector('[data-hero-media]');
  if (!media) return;
  gsap.fromTo(media, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
  gsap.to(media, {
    yPercent: 12, ease: 'none',
    scrollTrigger: { trigger: media.closest('section'), start: 'top top', end: 'bottom top', scrub: true },
  });
}

/* ---------------- Custom cursor + magnetic buttons (desktop only) ---------------- */
let cursor;
function initCursor() {
  if (!finePointer || reduced || cursor) return;
  cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-label">Play</span>';
  document.body.appendChild(cursor);
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  window.addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); cursor.classList.add('show'); }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('show'));
  document.addEventListener('mouseover', (e) => {
    const vid = e.target.closest('[data-cursor="video"]');
    const big = e.target.closest('a, button, summary, select, [data-cursor]');
    cursor.classList.toggle('vid', !!vid);
    cursor.classList.toggle('big', !!big && !vid);
    if (vid) cursor.querySelector('.cursor-label').textContent = vid.dataset.cursorLabel || 'Play';
  });
}
// Keep the cursor element across page swaps
document.addEventListener('astro:after-swap', () => { if (cursor) document.body.appendChild(cursor); });

function initMagnetic() {
  if (!finePointer || reduced) return;
  document.querySelectorAll('.btn, .play, [data-magnetic]').forEach((el) => {
    if (el.closest('.facade')) return;
    const strength = el.classList.contains('play') ? 0.35 : 0.25;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: 0.4, ease: 'power3.out' });
    };
    const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, .4)', clearProps: 'transform' });
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
  });
}

/* ---------------- Hover video previews (Work cards) ---------------- */
function initPreviews() {
  if (!finePointer) return;
  document.querySelectorAll('[data-preview]').forEach((card) => {
    const v = card.querySelector('video[data-src]');
    if (!v) return;
    card.addEventListener('mouseenter', () => {
      if (!v.src) {
        v.src = v.dataset.src;
        v.addEventListener('error', () => v.remove(), { once: true });
        v.addEventListener('loadeddata', () => v.classList.add('ready'), { once: true });
      }
      v.play().catch(() => {});
    });
    card.addEventListener('mouseleave', () => { v.pause(); });
  });
}

/* ---------------- Video facades: thumbnail first, player on click ---------------- */
function embedUrl(el) {
  const yt = el.dataset.youtube, vm = el.dataset.vimeo;
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  if (vm) return `https://player.vimeo.com/video/${vm}?autoplay=1&dnt=1`;
  return '';
}
function makeFrame(src, title) {
  const f = document.createElement('iframe');
  f.className = 'vframe';
  f.src = src;
  f.title = title || 'Video player';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  return f;
}
function initFacades() {
  document.querySelectorAll('button.facade').forEach((b) => {
    b.addEventListener('click', () => {
      const src = embedUrl(b);
      if (!src) return;
      b.replaceWith(makeFrame(src, b.getAttribute('aria-label')));
    });
  });
  // Lightbox (hero "play showreel")
  const lb = document.querySelector('.lightbox');
  document.querySelectorAll('[data-lightbox]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const src = embedUrl(btn);
      if (!src || !lb) return;
      e.preventDefault();
      const inner = lb.querySelector('.lightbox-inner');
      inner.querySelector('iframe')?.remove();
      inner.appendChild(makeFrame(src, 'Showreel'));
      lb.classList.add('open');
      lenis?.stop();
      lb.querySelector('.lightbox-close').focus();
    });
  });
  if (lb) {
    const close = () => { lb.classList.remove('open'); lb.querySelector('iframe')?.remove(); lenis?.start(); };
    lb.querySelector('.lightbox-close').addEventListener('click', close);
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    const esc = (e) => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); };
    document.addEventListener('keydown', esc);
    cleanups.push(() => document.removeEventListener('keydown', esc));
  }
}

/* ---------------- Showreel loop: hide placeholder label once it plays ---------------- */
function initShowreel() {
  const v = document.querySelector('[data-showreel]');
  if (!v) return;
  const label = document.querySelector('[data-showreel-label]');
  v.addEventListener('loadeddata', () => { v.style.opacity = '1'; label?.remove(); }, { once: true });
  v.addEventListener('error', () => v.remove(), { once: true });
  v.querySelector('source')?.addEventListener('error', () => v.remove(), { once: true });
  if (reduced) { v.removeAttribute('autoplay'); v.pause(); }
}

/* ---------------- Mobile menu ---------------- */
function closeMenu() {
  const m = document.querySelector('.mnav');
  const b = document.querySelector('.mopen');
  if (!m || !b || !m.classList.contains('open')) return false;
  m.classList.remove('open');
  b.setAttribute('aria-expanded', 'false');
  m.setAttribute('aria-hidden', 'true');
  m.inert = true;
  document.body.classList.remove('menu-open');
  lenis?.start();
  return true;
}
function initMenu() {
  const b = document.querySelector('.mopen');
  const m = document.querySelector('.mnav');
  if (!b || !m) return;
  m.inert = true;
  b.addEventListener('click', () => {
    m.classList.add('open');
    m.inert = false;
    m.setAttribute('aria-hidden', 'false');
    b.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    lenis?.stop();
    m.querySelector('.mclose').focus();
    if (!reduced) gsap.fromTo(m.querySelectorAll('.mlink, .btns'), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: EASE, stagger: 0.05, delay: 0.1 });
  });
  m.querySelector('.mclose').addEventListener('click', () => { closeMenu(); b.focus(); });
  const esc = (e) => { if (e.key === 'Escape' && closeMenu()) b.focus(); };
  document.addEventListener('keydown', esc);
  cleanups.push(() => document.removeEventListener('keydown', esc));
}

/* ---------------- Google Analytics page views ---------------- */
function trackPage() {
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', { page_path: location.pathname, page_title: document.title });
  }
}

/* ---------------- Lifecycle ---------------- */
function init() {
  initMenu();
  initFacades();
  initShowreel();
  initPreviews();
  initCursor();
  trackPage();
  if (reduced) { root.classList.remove('anim'); return; }
  startLenis();
  ctx = gsap.context(() => {
    const delay = playIntro() || (navigated ? 0.45 : 0.15);
    heroIn(delay);
    initHero();
    initSplits();
    initReveals();
    initCounts();
    initMarquee();
  });
  initMagnetic();
  // Fonts change headline sizes, so measure again once they are ready
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

let ctx = null;
document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', () => {
  cleanups.forEach((fn) => fn());
  cleanups = [];
  ctx?.kill();
  ctx = null;
  lenis?.destroy();
  lenis = null;
});

// Let other page scripts reach the scroller (e.g. Work filter refresh)
window.__refreshScroll = () => { ScrollTrigger.refresh(); lenis?.resize(); };
