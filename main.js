/* ============================================================
   main.js — Agustin Sanchez
   Stack: Lenis + GSAP + ScrollTrigger
   Shared across Overview / Work / Contact / narrative pages.
   Calm document flow + scroll reveals. No sticky-panel system.
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ── MOTION — mirrors the :root motion tokens in style.css.
   Change both together. 'power3.out' is the GSAP twin of --ease.
   Exceptions: marquee drift (linear ticker) and scrub tweens (no ease). ── */
const MOTION = {
  ease: 'power3.out',
  fast: 0.25,
  base: 0.6,
  slow: 0.9,
  wipe: 1.15,     // image clip-wipe
  settle: 1.5,    // image scale settle (always paired with wipe)
  stagger: 0.08,
  gateTimeout: 4000, // ms an image may hold a reveal before it opens anyway
};

/* ── DECODE GATE — a reveal never plays over a half-loaded image.
   Resolves when the image has decoded, errored (a broken file must not
   hang a reveal), or the timeout lapses. ── */
function decoded(img, timeout = MOTION.gateTimeout) {
  if (!img || !img.decode) return Promise.resolve();
  const attempt = () => img.decode().catch(() => {});
  const ready = img.complete
    ? attempt()
    : new Promise((res) => {
        img.addEventListener('load', () => attempt().then(res), { once: true });
        img.addEventListener('error', res, { once: true });
      });
  return Promise.race([ready, new Promise((res) => setTimeout(res, timeout))]);
}
function decodedAll(imgs, timeout = MOTION.gateTimeout) {
  return Promise.all([...imgs].map((i) => decoded(i, timeout)));
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 640px)').matches;

/* Page entrance is handled by cross-document View Transitions (style.css).
   Browsers without support paint instantly; heroes carry their own entrance. */

/* ============================================================
   1. LENIS — weighted smooth scroll
   ============================================================ */

/* Light touch: higher lerp + full wheel ratio so the page tracks the
   hand closely. Smoothing stays; the syrup goes. */
const lenis = new Lenis({
  lerp: 0.12,
  smoothWheel: true,
  wheelMultiplier: 1,
});
gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

if (prefersReducedMotion) {
  lenis.options.lerp = 1;
  gsap.globalTimeline.timeScale(1000);
}

/* Nav scrolled state: solid surface once content starts passing under it */
const navEl = document.querySelector('.nav');
if (navEl) {
  lenis.on('scroll', ({ scroll }) => {
    navEl.classList.toggle('is-scrolled', scroll > 48);
  });
}

/* Anchor links route through Lenis */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length > 1) {
      const target = document.querySelector(id);
      if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -80 }); }
    }
  });
});

/* ============================================================
   2. HERO — reveal on load (Overview + page heads)
   ============================================================ */

if (!prefersReducedMotion) {
  const heroSpans = document.querySelectorAll('[data-hero] .line-mask span');
  if (heroSpans.length) {
    gsap.fromTo(heroSpans,
      { yPercent: 110 },
      { yPercent: 0, duration: 1.0, ease: MOTION.ease, stagger: MOTION.stagger, delay: 0.2 }
    );
  }
  const heroFade = document.querySelectorAll('[data-hero] [data-hero-fade]');
  if (heroFade.length) {
    gsap.from(heroFade, {
      opacity: 0, y: 20, duration: MOTION.slow, ease: MOTION.ease,
      stagger: 0.12, delay: 0.85,
    });
  }
}

/* ============================================================
   3. SCROLL REVEALS
   [data-lines]  → headline line-masks rise on enter
   [data-reveal] → fade + rise on enter
   ============================================================ */

if (!prefersReducedMotion) {
  /* Triggers sit low (92%) so the next section starts arriving while the
     previous is still on screen: sections hand off instead of ending. */
  gsap.utils.toArray('[data-lines]').forEach((group) => {
    const spans = group.querySelectorAll('.line-mask span');
    if (!spans.length) return;
    gsap.fromTo(spans,
      { yPercent: 110 },
      {
        yPercent: 0, duration: MOTION.slow, ease: MOTION.ease, stagger: MOTION.stagger,
        scrollTrigger: { trigger: group, start: 'top 92%' },
      }
    );
  });

  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    const delay = parseFloat(el.dataset.reveal) || 0;
    gsap.from(el, {
      opacity: 0, y: 26, duration: MOTION.slow, ease: MOTION.ease, delay,
      scrollTrigger: { trigger: el, start: 'top 92%' },
    });
  });

  /* BACKGROUND MORPH — [data-bg="#hex"] sections shift the page surface as
     they arrive, so the page reads as one continuous material rather than
     stacked blocks. Soft tween on crossing, not scrub: mood, not mechanics. */
  const bgSections = gsap.utils.toArray('[data-bg]');
  if (bgSections.length) {
    const baseBg = getComputedStyle(document.body).backgroundColor;
    const setBg = (color) =>
      gsap.to('body', { backgroundColor: color, duration: 1.0, ease: 'power2.out', overwrite: 'auto' });
    bgSections.forEach((sec, i) => {
      const prev = i ? bgSections[i - 1].dataset.bg : baseBg;
      ScrollTrigger.create({
        trigger: sec, start: 'top 60%',
        onEnter: () => setBg(sec.dataset.bg),
        onLeaveBack: () => setBg(prev),
      });
    });
  }

  /* IMAGE REVEAL — clip-wipe on the frame + slow scale-settle on the img.
     This is the betteroff-style "rise and settle."
     Decode-gated: the wipe holds until the image has decoded, so the
     reveal never uncovers a loading frame. */
  gsap.utils.toArray('[data-img]').forEach((frame) => {
    const img = frame.querySelector('img');
    gsap.set(frame, { clipPath: 'inset(0 0 100% 0)' });
    if (img) gsap.set(img, { scale: 1.18 });
    const play = () => {
      gsap.to(frame, { clipPath: 'inset(0 0 0% 0)', duration: MOTION.wipe, ease: MOTION.ease });
      if (img) {
        gsap.to(img, {
          scale: 1, duration: MOTION.settle, ease: MOTION.ease,
          // clear the inline transform so CSS :hover zoom can take over
          onComplete: () => gsap.set(img, { clearProps: 'transform' }),
        });
      }
    };
    ScrollTrigger.create({
      trigger: frame, start: 'top 85%', once: true,
      onEnter: () => decoded(img).then(play),
    });
  });

  /* PARALLAX — element drifts against scroll. data-parallax="N" = strength. */
  gsap.utils.toArray('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.dataset.parallax) || 8;
    gsap.fromTo(el,
      { yPercent: -amt },
      { yPercent: amt, ease: 'none',
        scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true } }
    );
  });

  /* SCROLL-SCALE — big type grows + drifts gently as it crosses the
     viewport. Deliberately faint: presence, not performance. */
  gsap.utils.toArray('.statement__inner, .pov__lead, .movement__title').forEach((el) => {
    el.style.transformOrigin = 'left center';
    el.style.willChange = 'transform';
    gsap.fromTo(el,
      { scale: 0.97, yPercent: 4 },
      { scale: 1.02, yPercent: -4, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }
    );
  });
}

/* ============================================================
   4. PROJECT ROWS — staggered reveal + hover dim
   ============================================================ */

const projectRows = document.querySelectorAll('.project-row');
if (projectRows.length) {
  if (!prefersReducedMotion) {
    gsap.set(projectRows, { opacity: 0, y: 16 });
    gsap.to(projectRows, {
      opacity: 1, y: 0, duration: MOTION.base, ease: MOTION.ease, stagger: MOTION.stagger,
      scrollTrigger: { trigger: '.projects', start: 'top 78%' },
    });
  }

  projectRows.forEach((row) => {
    const table = row.closest('.projects');
    const arrow = row.querySelector('.project-row__arrow');
    row.addEventListener('mouseenter', () => {
      table.querySelectorAll('.project-row').forEach((r) => {
        if (r !== row) gsap.to(r, { opacity: 0.32, duration: MOTION.fast, overwrite: true });
      });
      if (arrow) gsap.to(arrow, { x: 6, y: -4, duration: MOTION.fast, ease: MOTION.ease });
    });
    row.addEventListener('mouseleave', () => {
      table.querySelectorAll('.project-row').forEach((r) => {
        gsap.to(r, { opacity: 1, duration: MOTION.fast, overwrite: true });
      });
      if (arrow) gsap.to(arrow, { x: 0, y: 0, duration: MOTION.fast, ease: MOTION.ease });
    });
  });
}

/* ============================================================
   5. MARQUEE — slow looping photo strip
   Track holds two identical groups; -50% = one full group → seamless.
   Pauses (slows) on hover. Skipped under reduced motion.
   ============================================================ */

/* Each marquee auto-drifts (its own direction) AND surges with scroll:
   scrolling pushes every strip in the scroll direction, then it eases back
   to its drift. Position is driven manually on the gsap ticker so the loop
   stays seamless (track holds two identical groups → wrap at half width). */
const marquees = [];
document.querySelectorAll('.marquee').forEach((marquee) => {
  const track = marquee.querySelector('.marquee__track');
  if (!track) return;
  const m = {
    track,
    dir: marquee.classList.contains('marquee--reverse') ? -1 : 1,
    base: marquee.classList.contains('marquee--top') ? 16 : 22, // px/s drift
    x: 0, half: 0, hover: 1,
  };
  marquees.push(m);
  if (!prefersReducedMotion) {
    marquee.addEventListener('mouseenter', () => { m.hover = 0.12; });
    marquee.addEventListener('mouseleave', () => { m.hover = 1; });
  }
});

function measureMarquees() {
  marquees.forEach((m) => {
    // Seamless loop length = distance to the first item of the duplicated
    // second group (NOT scrollWidth/2, which is off by one gap and stutters).
    const kids = m.track.children;
    const mid = kids[kids.length / 2];
    m.half = mid ? mid.offsetLeft - kids[0].offsetLeft : m.track.scrollWidth / 2;
  });
}
measureMarquees();
window.addEventListener('load', measureMarquees);
window.addEventListener('resize', measureMarquees);

if (marquees.length && !prefersReducedMotion) {
  let scrollAccum = 0, lastScroll = 0;
  lenis.on('scroll', ({ scroll }) => { scrollAccum += scroll - lastScroll; lastScroll = scroll; });

  gsap.ticker.add((time, deltaMs) => {
    const dt = Math.min(deltaMs, 50) / 1000;
    const surge = scrollAccum * 0.1;    // portion of accumulated scroll spent this frame
    scrollAccum -= surge;               // remainder decays over the next frames (ease-out)
    marquees.forEach((m) => {
      if (!m.half) return;
      m.x -= m.dir * m.base * m.hover * dt; // auto drift
      m.x -= surge * 0.55;                   // gentle scroll surge (all strips, scroll direction)
      m.x = gsap.utils.wrap(-m.half, 0, m.x);
      m.track.style.transform = `translate3d(${m.x}px,0,0)`;
    });
  });
}

/* HERO — a slight settle as it scrolls away. Barely there on purpose. */
const heroEl = document.querySelector('.hero');
if (heroEl && !prefersReducedMotion) {
  gsap.to(heroEl, {
    yPercent: -6, opacity: 0.7, ease: 'none',
    scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom top', scrub: 0.5 },
  });
}

/* ============================================================
   6. FOOTER personal line
   ============================================================ */

const footerLine = document.querySelector('.footer__personal');
if (footerLine && !prefersReducedMotion) {
  gsap.from(footerLine, {
    opacity: 0, y: 14, duration: MOTION.slow, ease: MOTION.ease,
    scrollTrigger: { trigger: '.footer', start: 'top 88%' },
  });
}

/* ============================================================
   7. CONTACT FORM — Formspree submit
   ============================================================ */

const contactForm = document.getElementById('contact-form');
const contactThanks = document.getElementById('contact-thanks');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.textContent = 'Sending…';
    btn.disabled = true;
    try {
      const res = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        contactForm.hidden = true;
        contactThanks.hidden = false;
        contactThanks.focus();
      } else {
        btn.textContent = 'Try again →';
        btn.disabled = false;
      }
    } catch {
      btn.textContent = 'Try again →';
      btn.disabled = false;
    }
  });
}

/* ============================================================
   7b. CURSOR — a small dot that tracks tight, a hairline ring that
   trails a beat behind. Precise but playful. Interactive elements
   grow the ring; [data-cursor] adds a quippy label chip. Difference
   blend keeps dot and ring legible over photography.
   Mounted only on fine pointers, skipped under reduced motion.
   ============================================================ */

if (!prefersReducedMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.documentElement.classList.add('has-cursor');

  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  const label = document.createElement('div');
  label.className = 'cursor-label';
  document.body.append(ring, dot, label);

  let cx = -100, cy = -100;       // target (real cursor)
  let dx = -100, dy = -100;       // dot, tight
  let rx = -100, ry = -100;       // ring, trailing
  let seen = false;

  window.addEventListener('mousemove', (e) => {
    cx = e.clientX; cy = e.clientY;
    if (!seen) { dx = rx = cx; dy = ry = cy; seen = true; }
  }, { passive: true });

  gsap.ticker.add(() => {
    if (!seen) return;
    dx += (cx - dx) * 0.55; dy += (cy - dy) * 0.55;
    rx += (cx - rx) * 0.16; ry += (cy - ry) * 0.16;
    dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    label.style.left = `${dx}px`; label.style.top = `${dy}px`;
  });

  const INTERACTIVE = 'a, button, [data-cursor], input, textarea, select, label';
  document.addEventListener('mouseover', (e) => {
    const hit = e.target.closest(INTERACTIVE);
    document.documentElement.classList.toggle('is-hovering', !!hit);
    const quip = hit && hit.closest('[data-cursor]');
    if (quip && quip.dataset.cursor) {
      label.textContent = quip.dataset.cursor;
      label.classList.add('is-on');
    } else {
      label.classList.remove('is-on');
    }
  });
  document.addEventListener('mousedown', () => document.documentElement.classList.add('is-pressing'));
  document.addEventListener('mouseup', () => document.documentElement.classList.remove('is-pressing'));
  document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; label.classList.remove('is-on'); });
  document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });
}

/* ============================================================
   8. GALLERY ROWS — justified rows for photo sets.
   No crops: every image keeps its natural aspect ratio and each
   row shares one height (widths are ratio-proportional). An
   underfull last row sits at natural size, left-aligned.
   Layout, not motion — runs under reduced motion too.
   Markup: <div class="gallery--rows" data-rows> <figure><img…
   ============================================================ */

function justifyRows(container) {
  const items = [...container.children].filter((el) => !el.classList.contains('g-row'));
  const rowEls = [...container.querySelectorAll('.g-row')];
  // Unwrap any previous pass (resize re-run)
  rowEls.forEach((row) => {
    [...row.children].forEach((el) => container.insertBefore(el, row));
    row.remove();
    items.length = 0;
    items.push(...[...container.children].filter((el) => !el.classList.contains('g-row')));
  });
  const imgs = items.map((el) => (el.tagName === 'IMG' ? el : el.querySelector('img')));
  return decodedAll(imgs, 8000).then(() => {
    const W = container.clientWidth;
    if (!W || !items.length) return;
    // Target row height: tall enough to read, short enough for 2-4 frames a row
    const target = Math.min(Math.max(W * 0.34, 260), 480);
    let row = [];
    let sum = 0;
    const flush = (natural) => {
      if (!row.length) return;
      const div = document.createElement('div');
      div.className = 'g-row' + (natural ? ' g-row--natural' : '');
      if (natural) div.style.setProperty('--h', `${target}px`);
      container.appendChild(div);
      row.forEach((el) => div.appendChild(el));
      row = []; sum = 0;
    };
    items.forEach((el, i) => {
      const img = imgs[i];
      const r = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 3 / 2;
      el.style.setProperty('--r', r);
      el.style.aspectRatio = `${r}`;
      row.push(el); sum += r;
      if (sum * target >= W) flush(false);
    });
    flush(true); // leftover row keeps natural size
    container.classList.add('is-justified');
    // A natural row should sit no taller than the justified row above it
    const rows = container.querySelectorAll('.g-row');
    const natural = container.querySelector('.g-row--natural');
    if (natural && rows.length > 1) {
      const prev = rows[rows.length - 2];
      natural.style.setProperty('--h', `${Math.round(prev.getBoundingClientRect().height)}px`);
    }
    ScrollTrigger.refresh();
  });
}

document.querySelectorAll('[data-rows]').forEach((container) => {
  container._justified = justifyRows(container);
  let raf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => justifyRows(container));
  });
});

/* ============================================================
   9. CASCADE — grids reveal tile-by-tile.
   [data-cascade] children each get a --reveal-delay radiating
   from the group's top-left corner; CSS transitions do the rest
   (cheap, robust). Decode-gated per group: the cascade holds
   until the group's images are ready. Skipped entirely under
   reduced motion (tiles simply stay visible).
   ============================================================ */

if (!prefersReducedMotion) {
  document.querySelectorAll('[data-cascade]').forEach((group) => {
    const layoutReady = group._justified || Promise.resolve();
    layoutReady.then(() => {
      const inRows = group.querySelectorAll('.g-row > *');
      const tiles = inRows.length ? [...inRows] : [...group.children];
      if (!tiles.length) return;
      const max = parseFloat(group.dataset.cascade) || 0.45;
      const origin = tiles[0];
      const dists = tiles.map((t) =>
        Math.hypot(t.offsetLeft - origin.offsetLeft, t.offsetTop - origin.offsetTop));
      const top = Math.max(...dists, 1);
      tiles.forEach((t, i) =>
        t.style.setProperty('--reveal-delay', `${((dists[i] / top) * max).toFixed(3)}s`));
      group.classList.add('is-armed');
      ScrollTrigger.create({
        trigger: group, start: 'top 88%', once: true,
        onEnter: () =>
          decodedAll(group.querySelectorAll('img')).then(() =>
            requestAnimationFrame(() => group.classList.remove('is-armed'))),
      });
    });
  });
}

/* ============================================================
   10. REFRESH after fonts + images settle
   ============================================================ */

window.addEventListener('load', () => ScrollTrigger.refresh());
