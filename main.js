/* ============================================================
   main.js — Agustin Sanchez
   Stack: Lenis + GSAP + ScrollTrigger
   Architecture:
     - .panel = tall scroll container (sets dwell time)
     - .panel__content = position: sticky — pins 100vh
     - Build-ons fire as panel approaches pin point
     - page-bg drives all background color transitions
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   0. REDUCED MOTION — respect user preference
   ============================================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Phone-only flag — tablets (iPad, Surface) get full desktop treatment:
// Lenis smooth scroll, GSAP scrub bg transitions, sticky panels, and
// all animations. Only phones (≤768px) fall back to native scroll.
const isMobile            = window.matchMedia('(max-width: 768px)').matches;

/* ============================================================
   0b. PAGE REVEAL — body starts opacity:0 (set in <head> inline
   style to prevent FOUC). Fade in once this script has run and
   GSAP has set all initial states.
   ============================================================ */

gsap.to(document.body, {
  opacity: 1,
  duration: prefersReducedMotion ? 0 : 0.4,
  delay:    prefersReducedMotion ? 0 : 0.1,
  ease: 'power1.out',
  // No clearProps — removing the inline style would re-expose the
  // head CSS "body { opacity: 0 }" and blank the page permanently.
});

/* ============================================================
   1. LENIS — weighted smooth scroll
   ============================================================ */

const lenis = new Lenis({
  lerp:            0.072,
  smoothWheel:     true,
  orientation:     'vertical',
  wheelMultiplier: 0.55,
});

gsap.ticker.add((time) => { lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

if (prefersReducedMotion) {
  lenis.options.lerp = 1;           // instant scroll, no smoothing
  gsap.globalTimeline.timeScale(1000); // all animations complete in <1ms
}

/* ============================================================
   2. PAGE BACKGROUND — color transitions
   Desktop + tablet: GSAP scrub drives background-color on body.
   Phone: scroll-driven CSS transition on body. Sections stay
   transparent; a passive scroll listener picks the active section
   and updates body background-color; CSS handles the 0.7s ease.
   ============================================================ */

const pageBg = document.body;

// Build ordered list of all [data-bg] sections
const bgSections = Array.from(document.querySelectorAll('[data-bg]'));

// Set initial page-bg color immediately (used by desktop scrub + hero area)
if (bgSections.length) gsap.set(pageBg, { backgroundColor: bgSections[0].dataset.bg });

if (!isMobile) {
  // ── Desktop: scrub fromTo per section ──────────────────────
  // Last section (projects/blue) gets an early trigger so yellow→blue
  // completes while the section is still in the lower viewport —
  // well before content animates in at top 25%.
  bgSections.forEach((section, i) => {
    const fromBg = i === 0 ? section.dataset.bg : bgSections[i - 1].dataset.bg;
    const toBg   = section.dataset.bg;
    const isLast = i === bgSections.length - 1;

    gsap.fromTo(pageBg,
      { backgroundColor: fromBg },
      {
        backgroundColor: toBg,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: isLast ? 'top 75%' : 'top 20%',
          end:   isLast ? 'top 35%' : 'top top',
          scrub: 0.3,
        },
      }
    );
  });

} else {
  // ── Touch / tablet: scroll-driven CSS transition on page-bg ──
  // Sections remain transparent. page-bg (fixed, z-index:-2) owns
  // all color. A passive scroll listener picks whichever section's
  // midpoint has most recently crossed 40% of its height past the
  // viewport centre — only one section can win at a time.
  let activeTouchBg = '';

  function updateTouchBg() {
    const midY = window.scrollY + window.innerHeight * 0.5;
    let newBg   = bgSections[0].dataset.bg;

    for (const section of bgSections) {
      if (midY > section.offsetTop) {
        newBg = section.dataset.bg;
      }
    }

    if (newBg !== activeTouchBg) {
      activeTouchBg = newBg;
      pageBg.style.backgroundColor = newBg;
    }
  }

  // Seed initial colour with no transition (prevents flash on load)
  updateTouchBg();

  // Enable smooth transition only after first paint
  requestAnimationFrame(() => {
    pageBg.style.transition = 'background-color 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
  });

  window.addEventListener('scroll', updateTouchBg, { passive: true });
}

/* ============================================================
   2b. SCROLL FEEL — panel depth curve
   Inside every .panel (except hero) lerp follows a
   centre-distance curve:
     edge of panel   → LERP_FAST (0.072 — lighter, responsive)
     centre of panel → LERP_SLOW (0.052 — heavier, decelerates)
   As you scroll toward the centre lerp decreases → the
   section decelerates under you (ease-out arrival).
   As you push away from centre lerp increases → you have
   to overcome inertia to leave (ease-in departure).
   Symmetric: works identically scrolling up or down.
   Single wheelMultiplier throughout — no speed jumps.
   Desktop + tablet only.
   ============================================================ */

{
  const colorBuffers = Array.from(document.querySelectorAll('.color-buffer'));
  const allPanels    = Array.from(document.querySelectorAll('.panel:not(.panel--hero)'));

  const LERP_FAST = 0.072;  // between panels / panel edges
  const LERP_SLOW = 0.052;  // panel centre — gentle deceleration

  let panelZones = [];

  function buildScrollZones() {
    panelZones = allPanels.map(el => ({
      top:    el.offsetTop,
      height: el.offsetHeight,
    }));
  }
  buildScrollZones();
  window.addEventListener('resize', buildScrollZones);
  window.addEventListener('load',   buildScrollZones);

  lenis.on('scroll', ({ scroll }) => {
    const zone = panelZones.find(z => scroll >= z.top && scroll <= z.top + z.height);
    if (zone) {
      // Depth curve: centre of panel feels heavier, edges feel lighter
      const progress       = (scroll - zone.top) / zone.height;
      const distFromCentre = Math.abs(progress - 0.5) * 2;
      lenis.options.lerp   = LERP_SLOW + distFromCentre * (LERP_FAST - LERP_SLOW);
    } else {
      lenis.options.lerp = LERP_FAST;
    }
  });
}

/* ============================================================
   3. HUD — tone word + section label crossfade + dark mode
   ============================================================ */

const hudEl     = document.getElementById('hud');
const hudSectEl = document.getElementById('hud-section');

gsap.to(hudEl, { opacity: 1, duration: 1.0, ease: 'power2.out', delay: 1.5 });

// Dark mode toggle
document.querySelectorAll('[data-theme="dark"]').forEach((section) => {
  ScrollTrigger.create({
    trigger: section,
    start: 'top 40%',
    end:   'bottom 40%',
    onEnter:     () => hudEl.classList.add('hud--dark'),
    onLeave:     () => hudEl.classList.remove('hud--dark'),
    onEnterBack: () => hudEl.classList.add('hud--dark'),
    onLeaveBack: () => hudEl.classList.remove('hud--dark'),
  });
});

// Tone word + label crossfade
function crossfadeText(el, text) {
  gsap.to(el, {
    opacity: 0, duration: 0.18, ease: 'power1.in',
    onComplete: () => {
      el.textContent = text;
      gsap.to(el, { opacity: text ? 1 : 0, duration: 0.18, ease: 'power1.out' });
    },
  });
}

document.querySelectorAll('[data-tone]').forEach((el) => {
  const label = el.dataset.label ?? '—';
  ScrollTrigger.create({
    trigger: el,
    start: 'top 50%',
    end:   'bottom 50%',
    onEnter:     () => { crossfadeText(hudSectEl, label); },
    onEnterBack: () => { crossfadeText(hudSectEl, label); },
  });
});

/* Section 4 lerp modulation removed — superseded by the
   continuous depth curve in section 2b above. */

/* ============================================================
   5. HERO — load animation (identity: AGUSTIN SANCHEZ.)
   ============================================================ */

gsap.fromTo('.hero-headline .line-mask span',
  { yPercent: 110 },
  { yPercent: 0, duration: 1.0, ease: 'power3.out', stagger: 0.1, delay: 0.25 }
);


gsap.from('#hero-strip', {
  opacity: 0,
  y: 20,
  duration: 0.9,
  ease: 'power2.out',
  delay: 1.0,
});

/* ============================================================
   6. PANEL ANIMATION SYSTEM
   registerPanel(sel, buildFn) — one call per sticky panel.

   set* helpers — apply initial hidden states before reveal.
     CSS also sets these; GSAP overrides with precise values.
   add* helpers — add entrance tweens to the scrubbed timeline.

   To add a case study: call registerPanel() with a selector
   and a buildFn that describes the animation sequence.
   ============================================================ */

// Trigger range for sticky-panel text build-ons.
// Desktop: fires during dwell — content is pinned and stationary when text reveals.
// Mobile:  fires during approach — panels are natural-flow on phones (no sticky/dwell).
const PANEL_START = isMobile ? 'top 80%' : 'top top';
const PANEL_END   = isMobile ? 'top 20%' : () => `+=${window.innerHeight * 0.16}`;

/* ── Query helpers ── */
const q  = (scope, sel) => scope.querySelector(sel);
const qa = (scope, sel) => scope.querySelectorAll(sel);

/* ── Initial state setters ── */
function setLabel(el)         { if (el) gsap.set(el, { opacity: 0 }); }
function setSpans(els)        { if (els && els.length) gsap.set(els, { yPercent: 110 }); }
function setImage(el)         { if (el) gsap.set(el, { yPercent: 110 }); }
function setFade(els, y = 24) { if (els && (els.nodeType || els.length)) gsap.set(els, { opacity: 0, y }); }
function setNote(el)          { if (el) gsap.set(el, { opacity: 0, y: 14 }); }

/* ── Entrance tween helpers ── */
function addLabel(tl, el, pos = '<', opacity = 0.55) {
  if (!el) return;
  tl.to(el, { opacity, duration: 0.3, ease: 'power2.out' }, pos);
}
function addSpans(tl, els, pos = '<', dur = 0.8, stagger = 0.13) {
  if (!els || !els.length) return;
  tl.fromTo(els, { yPercent: 110 }, { yPercent: 0, duration: dur, ease: 'power3.out', stagger }, pos);
}
function addImage(tl, el, pos = '<') {
  if (!el) return;
  tl.to(el, { yPercent: 0, duration: 0.9, ease: 'power3.out' }, pos);
}
function addFade(tl, els, pos = '<', dur = 0.8, stagger = 0.10) {
  if (!els || (!els.nodeType && !els.length)) return;
  tl.to(els, { opacity: 1, y: 0, duration: dur, ease: 'power3.out', stagger }, pos);
}
function addNote(tl, el, pos = '<') {
  if (!el) return;
  tl.to(el, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, pos);
}
function addReveal(tl, el, pos = '<', dur = 0.4) {
  if (!el) return;
  tl.to(el, { opacity: 1, duration: dur, ease: 'power2.out' }, pos);
}
function addRows(tl, els, pos = '<') {
  if (!els || !els.length) return;
  tl.to(els, { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', stagger: 0.10 }, pos);
}

/* ── Panel factory ── */
function registerPanel(sel, buildFn) {
  const panel = typeof sel === 'string' ? document.querySelector(sel) : sel;
  if (!panel) return;
  const tl = gsap.timeline({
    scrollTrigger: { trigger: panel, start: PANEL_START, end: PANEL_END, scrub: true },
  });
  buildFn(panel, tl);
}

/* ── 6. Leadership ── */
registerPanel('.panel--leadership', (panel, tl) => {
  const label = q(panel, '.intro-label');
  const photo = q(panel, '.leadership-image');
  const spans = qa(panel, '.leadership-headline .line-mask span');
  const paras = qa(panel, '.body-para');
  const note  = q(panel, '.org-intro-note');

  setLabel(label); setImage(photo); setSpans(spans); setFade(paras); setNote(note);

  addLabel(tl, label);
  addImage(tl, photo, '<+0.08');
  addSpans(tl, spans, '<+0.08');
  addFade(tl,  paras, '<+0.28');
  addNote(tl,  note,  '<+0.25');
});

/* ── 7a. Org intro ── */
registerPanel('.panel--org-intro', (panel, tl) => {
  const label = q(panel, '.org-label');
  const spans = qa(panel, '.org-intro-lines .line-mask span');
  const note  = q(panel, '.org-intro-note');

  setLabel(label); setSpans(spans); setNote(note);

  addLabel(tl, label);
  addSpans(tl, spans, '<+0.1', 0.9);
  addNote(tl,  note,  '<+0.35');
});

/* ── 7b. Org statement ── */
registerPanel('.panel--org-statement', (panel, tl) => {
  const mutedSpans  = qa(panel, '.org-lines--muted .line-mask span');
  const accentSpans = qa(panel, '.org-lines--accent .line-mask span');
  const notes       = qa(panel, '.org-intro-note');

  setSpans(mutedSpans); setSpans(accentSpans); setFade(notes, 14);

  addSpans(tl, mutedSpans);
  addSpans(tl, accentSpans, '<+0.22');
  addFade(tl,  notes, '<+0.22', 0.7, 0.06);
});

/* ── 8. Beliefs ── */
registerPanel('.panel--beliefs-full', (panel, tl) => {
  const label   = q(panel, '.intro-label');
  const hlSpans = qa(panel, '.beliefs-headline .line-mask span');
  const divider = q(panel, '.beliefs-divider');

  setLabel(label); setSpans(hlSpans);
  if (divider) gsap.set(divider, { opacity: 0 });

  addLabel(tl,  label);
  addSpans(tl,  hlSpans, '<+0.08', 0.75, 0.12);
  addReveal(tl, divider, '<+0.2');

  panel.querySelectorAll('.belief-col').forEach((col, i) => {
    const cl = q(col, '.principle-label');
    const cs = qa(col, '.principle-headline .line-mask span');
    const cb = q(col, '.principle-body');
    setLabel(cl); setSpans(cs);
    if (cb) gsap.set(cb, { opacity: 0, y: 18 });

    addLabel(tl, cl, i === 0 ? '<+0.2' : '<+0.06');
    addSpans(tl, cs, '<+0.08', 0.65, 0.10);
    if (cb) tl.to(cb, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '<+0.18');
  });
});

/* ── 9. Curiosity ── */
registerPanel('#p-curiosity', (panel, tl) => {
  const label = q(panel, '.principle-label');
  const spans = qa(panel, '.principle-headline .line-mask span');
  const body  = q(panel, '.principle-body');
  const xl    = q(panel, '.principle-headline--xl');

  setLabel(label); setSpans(spans);
  if (body) gsap.set(body, { opacity: 0, y: 18 });

  addLabel(tl, label);
  if (xl) tl.from(xl, { scale: 1.02, duration: 1.0, ease: 'power3.out' }, '<');
  addSpans(tl, spans, '<+0.08');
  if (body) tl.to(body, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '<+0.25');
});

/* ── 10. The Gap ── */
registerPanel('#p-gap', (panel, tl) => {
  const label    = q(panel, '.principle-label');
  const hlSpans  = qa(panel, '.principle-headline .line-mask span');
  const subSpans = qa(panel, '.principle-subhead .line-mask span');
  const body     = q(panel, '.principle-body');
  const note     = q(panel, '.org-intro-note');

  setLabel(label); setSpans(hlSpans); setSpans(subSpans);
  if (body) gsap.set(body, { opacity: 0, y: 18 });
  setNote(note);

  addLabel(tl,     label);
  addSpans(tl,     hlSpans,  '<+0.08');
  addSpans(tl,     subSpans, '<+0.2', 0.7, 0.12);
  if (body) tl.to(body, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, '<+0.2');
  addNote(tl,      note, '<+0.2');
});

/* ── 11. Projects headline (non-sticky) ──
   Color transition completes at top 35% of the section.
   Content waits until top 25% so it enters on a fully blue background. */
const projectsSection = document.querySelector('.projects-section');
if (projectsSection) {
  const label         = projectsSection.querySelector('.intro-label');
  const headlineSpans = projectsSection.querySelectorAll('.projects-headline .line-mask span');

  if (label) gsap.set(label, { opacity: 0 });
  if (headlineSpans.length) gsap.set(headlineSpans, { yPercent: 110 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: projectsSection, start: 'top 25%', end: 'top -15%',
      scrub: 0.5,
    },
  });
  if (label) tl.to(label, { opacity: 0.55, duration: 0.35, ease: 'power2.out' });
  if (headlineSpans.length) tl.fromTo(headlineSpans, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: 'power3.out', stagger: 0.13 }, '<+0.1');
}

// Project rows — fire after section is well into viewport (color already done)
gsap.set('.project-row', { opacity: 0, y: 14 });
gsap.to('.project-row', {
  opacity: 1, y: 0,
  duration: 0.75, ease: 'power3.out', stagger: 0.085,
  scrollTrigger: {
    trigger: '.projects-table', start: 'top 55%',
    toggleActions: 'restart none none reset',
  },
});

// Row hover — dim siblings, nudge arrow
document.querySelectorAll('.project-row').forEach((row) => {
  const table = row.closest('.projects-table');
  const arrow = row.querySelector('.project-row__arrow');

  row.addEventListener('mouseenter', () => {
    table.querySelectorAll('.project-row').forEach((r) => {
      if (r !== row) gsap.to(r, { opacity: 0.3, duration: 0.2, overwrite: true });
    });
    if (arrow) gsap.to(arrow, { x: 6, y: -4, duration: 0.25, ease: 'power2.out' });
  });

  row.addEventListener('mouseleave', () => {
    table.querySelectorAll('.project-row').forEach((r) => {
      gsap.to(r, { opacity: 1, duration: 0.25, overwrite: true });
    });
    if (arrow) gsap.to(arrow, { x: 0, y: 0, duration: 0.2, ease: 'power2.out' });
  });
});

/* ── 11b. Delivery Panel A ── */
registerPanel('#p-delivery', (panel, tl) => {
  const label    = q(panel, '.principle-label');
  const hlSpans  = qa(panel, '.principle-headline .line-mask span');
  const subSpans = qa(panel, '.principle-subhead .line-mask span');
  const body     = q(panel, '.principle-body');

  setLabel(label); setSpans(hlSpans); setSpans(subSpans);
  if (body) gsap.set(body, { opacity: 0, y: 18 });

  addLabel(tl,     label);
  addSpans(tl,     hlSpans,  '<+0.08');
  addSpans(tl,     subSpans, '<+0.2', 0.7, 0.12);
  if (body) tl.to(body, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, '<+0.2');
});

/* ── 11c. Delivery Panel B ── */
registerPanel('#p-framework', (panel, tl) => {
  const label   = q(panel, '.principle-label');
  const hlSpans = qa(panel, '.principle-headline .line-mask span');
  const body    = q(panel, '.principle-body');
  const table   = q(panel, '.delivery-table');
  const phases  = qa(panel, '.delivery-phase');

  setLabel(label); setSpans(hlSpans);
  if (body)   gsap.set(body,   { opacity: 0, y: 18 });
  if (table)  gsap.set(table,  { opacity: 0 });
  if (phases.length) gsap.set(phases, { opacity: 0, y: 12 });

  addLabel(tl,  label);
  addSpans(tl,  hlSpans, '<+0.08');
  if (body)  tl.to(body,  { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, '<+0.2');
  addReveal(tl, table, '<+0.2');
  addRows(tl,   phases, '<+0.1');
});

/* ── 12b. AI Matrix ──
   AI cells use CSS color opacity for dimming (not GSAP) to preserve
   AAA contrast. GSAP animates element opacity 0→1 only.          */
if (!prefersReducedMotion) {
  registerPanel('#p-ai-matrix', (panel, tl) => {
    const eyebrow    = q(panel, '.principle-label');
    const hlSpans    = qa(panel, '.principle-headline .line-mask span');
    const body       = q(panel, '.principle-body');
    const phHeaders  = qa(panel, '.ai-m__ph');
    const discLabels = qa(panel, '.ai-m__disc');
    const hCells     = qa(panel, '.ai-m__cell--h');
    const aiCells    = qa(panel, '.ai-m__cell--ai');
    const legend     = q(panel, '.ai-frame__legend');

    setLabel(eyebrow); setSpans(hlSpans);
    if (body)              gsap.set(body,       { opacity: 0, y: 6 });
    if (phHeaders.length)  gsap.set(phHeaders,  { opacity: 0, y: 10 });
    if (discLabels.length) gsap.set(discLabels, { opacity: 0 });
    if (hCells.length)     gsap.set(hCells,     { opacity: 0, y: 6 });
    if (aiCells.length)    gsap.set(aiCells,    { opacity: 0, y: 6 });
    if (legend)            gsap.set(legend,     { opacity: 0 });

    addLabel(tl,          eyebrow, '<', 0.75);
    addSpans(tl,          hlSpans, '<+0.08', 0.6, 0.08);
    if (body)              tl.to(body,       { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' }, '<+0.12');
    if (phHeaders.length)  tl.to(phHeaders,  { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.08 }, '<+0.15');
    if (discLabels.length) tl.to(discLabels, { opacity: 0.75, duration: 0.35, ease: 'power2.out', stagger: 0.11 }, '<+0.15');
    if (hCells.length)     tl.to(hCells,     { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.08 }, '<+0.1');
    if (aiCells.length)    tl.to(aiCells,    { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.08 }, '<+0.05');
    if (legend)            tl.to(legend,     { opacity: 1, duration: 0.3, ease: 'power2.out' }, '<+0.15');
  });
}

/* ============================================================
   13. PANEL EXIT — spans slide up out of line-masks on scroll-out.
   Mirrors the entrance: lines entered bottom-up, they exit top-up.
   Last line leaves first (reverse stagger), same wave direction.
   Hero gets the original blur fade. Mobile skipped.
   ============================================================ */

if (!isMobile) document.querySelectorAll('.panel').forEach((panel) => {
  const isHero = panel.classList.contains('panel--hero');

  if (isHero) {
    // Hero: keep the original blur/fade on the content block
    const content = panel.querySelector('.panel__content');
    if (content) {
      gsap.fromTo(content,
        { opacity: 1, filter: 'blur(0px)' },
        { opacity: 0, filter: 'blur(10px)', ease: 'power2.in',
          scrollTrigger: { trigger: panel, start: 'bottom 45%', end: 'bottom 5%', scrub: 0.4 }
        }
      );
    }
    return;
  }

  // Non-hero: exit fires DURING the dwell so content is still pinned while
  // text blinds up. 125vh panels = 25vh dwell. Entrance: 0→0.16vh, rest: 0.16→0.20vh.
  // Exit: 0.20→0.24vh (4vh, fully within dwell). Panel unsticks at 0.25vh.
  const ST = {
    trigger: panel,
    start:   () => `top+=${window.innerHeight * 0.20} top`,
    end:     () => `top+=${window.innerHeight * 0.24} top`,
    scrub:   0.5,
  };

  const spans  = panel.querySelectorAll('.line-mask span');
  const photo  = panel.querySelector('.leadership-image');
  const others = panel.querySelectorAll(
    '.principle-body, .org-intro-note, .body-para, ' +
    '.intro-label, .org-label, .principle-label, ' +
    '.delivery-phase, .ai-m__ph, .ai-m__disc, .ai-m__cell, ' +
    '.beliefs-divider, .delivery-table, .ai-frame__legend'
  );

  if (spans.length) {
    gsap.to(spans, {
      yPercent:        -110,
      ease:            'power3.in',
      stagger:         { each: 0.08, from: 'start' },
      immediateRender: false,
      overwrite:       'auto',
      scrollTrigger:   ST,
    });
  }

  if (photo) {
    gsap.to(photo, {
      yPercent:        -110,
      ease:            'power3.in',
      immediateRender: false,
      overwrite:       'auto',
      scrollTrigger:   ST,
    });
  }

  if (others.length) {
    gsap.to(others, {
      opacity:         0,
      y:               -22,
      ease:            'power3.in',
      immediateRender: false,
      overwrite:       'auto',
      scrollTrigger:   ST,
    });
  }
});

/* ============================================================
   12. FOOTER
   ============================================================ */

gsap.set('.footer__personal', { opacity: 0, y: 14 });
gsap.to('.footer__personal', {
  opacity: 1, y: 0,
  duration: 0.85, ease: 'power2.out',
  scrollTrigger: {
    trigger: '.footer',
    start: 'top 80%',
    toggleActions: 'restart none none reset',
  },
});

/* ============================================================
   14. HERO GRID — pinpoint grid, opacity wave, repulsion physics
   A tight grid of 1 px ink dots fills the canvas.
   Two systems run simultaneously:

   WAVE — a slow sine wave travels across the grid, cycling
   each dot's opacity between A_MIN (20%) and A_MAX (33%).
   The wave is purely visual — dots do not move.

   REPULSION — mouse and touch act as negative-gravity sources.
   Each dot has rest coordinates (rx, ry) and live coordinates
   (x, y) driven by spring physics:
     • Pointer within PUSH_RADIUS → repulsion force pushes dot
       away, proportional to (1 - dist/radius)²
     • Spring constant pulls dot back to rest
     • Velocity damps each frame
   Fade: within FADE_RADIUS (larger than push) dot opacity is
   multiplied toward 0, creating a clean void at the pointer
   that fills back in as the pointer leaves.
   Dots never grow — radius is fixed at DOT_R throughout.
   Skipped if prefers-reduced-motion.
   ============================================================ */

(function initHeroGrid() {
  if (prefersReducedMotion) return;

  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* ---- Ink #1A1814 ---- */
  const IR = 26, IG = 24, IB = 20;

  /* ---- Config ---- */
  const CELL         = 24;    // tight grid — px between dots
  const DOT_R        = 1.0;   // fixed pinpoint radius (never changes)

  const A_MIN        = 0.20;  // wave trough opacity
  const A_MAX        = 0.33;  // wave peak opacity
  const WAVE_SPD     = 0.40;  // wave travel speed (rad/s)
  const WAVE_FX      = 0.016; // spatial freq X
  const WAVE_FY      = 0.011; // spatial freq Y (different → diagonal travel)

  const PUSH_RADIUS  = 320;   // repulsion influence (px)
  const PUSH_STR     = 0.7;   // repulsion force magnitude
  const SPRING_K     = 0.006; // spring stiffness — weak pull, slow return
  const DAMPING      = 0.65;  // velocity RETENTION per frame — lower = more friction, no oscillation

  const FADE_RADIUS  = 130;   // opacity fade zone (larger than push)
  const VFADE_START  = 0.55;  // vertical fade begins at this fraction of H

  let W, H, dots = [], dpr;

  /* ---- Build dot grid on resize ---- */
  function buildGrid() {
    dpr = Math.min(devicePixelRatio, 2);
    W   = canvas.clientWidth;
    H   = canvas.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const offX = (W % CELL) * 0.5;
    const offY = (H % CELL) * 0.5;
    dots = [];
    const cols = Math.ceil(W / CELL) + 1;
    const rows = Math.ceil(H / CELL) + 1;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rx = offX + c * CELL;
        const ry = offY + r * CELL;
        /* rx/ry = rest position; x/y = live position; vx/vy = velocity */
        dots.push({ rx, ry, x: rx, y: ry, vx: 0, vy: 0 });
      }
    }
  }

  new ResizeObserver(buildGrid).observe(canvas);
  buildGrid();

  /* ---- Pointer map — mouse + multi-touch ---- */
  /* Each entry: { x, y, sx, sy } — raw target + smoothed position */
  const pointers = new Map();

  function canvasXY(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }
  function inCanvas(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return clientX >= r.left && clientX <= r.right &&
           clientY >= r.top  && clientY <= r.bottom;
  }

  window.addEventListener('mousemove', (e) => {
    if (inCanvas(e.clientX, e.clientY)) {
      const { x, y } = canvasXY(e.clientX, e.clientY);
      const p = pointers.get('mouse');
      if (p) { p.x = x; p.y = y; }
      else pointers.set('mouse', { x, y, sx: x, sy: y });
    } else {
      pointers.delete('mouse');
    }
  });

  window.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (inCanvas(t.clientX, t.clientY)) {
        const { x, y } = canvasXY(t.clientX, t.clientY);
        pointers.set(t.identifier, { x, y, sx: x, sy: y });
      }
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      const p = pointers.get(t.identifier);
      if (p) { const { x, y } = canvasXY(t.clientX, t.clientY); p.x = x; p.y = y; }
    }
  }, { passive: true });

  const clearTouch = (e) => { for (const t of e.changedTouches) pointers.delete(t.identifier); };
  window.addEventListener('touchend',    clearTouch, { passive: true });
  window.addEventListener('touchcancel', clearTouch, { passive: true });

  /* ---- Pause when hero is off-screen ---- */
  let raf = null, visible = true, t0 = null;
  const heroPanel = canvas.closest('.panel--hero');
  if (heroPanel) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(render);
    }, { threshold: 0 }).observe(heroPanel);
  }

  /* ---- Render loop ---- */
  function render(ts) {
    raf = requestAnimationFrame(render);
    if (!visible) return;
    if (!t0) t0 = ts;
    const t = (ts - t0) * 0.001; // seconds

    /* Smooth pointer positions */
    for (const p of pointers.values()) {
      p.sx += (p.x - p.sx) * 0.12;
      p.sy += (p.y - p.sy) * 0.12;
    }

    ctx.clearRect(0, 0, W, H);

    for (const d of dots) {

      /* ── Physics: repulsion from each pointer ──
         Force MAGNITUDE uses rest-position distance so the field
         is constant while the cursor is stationary — dots reach a
         stable equilibrium and stay there (persistent mass effect).
         Force DIRECTION uses current position so the push always
         points away from the cursor and doesn't cause artifacts. */
      for (const p of pointers.values()) {
        const rdx      = d.rx - p.sx;
        const rdy      = d.ry - p.sy;
        const restDist = Math.sqrt(rdx * rdx + rdy * rdy);

        if (restDist < PUSH_RADIUS) {
          const t0 = 1 - restDist / PUSH_RADIUS;      // 0→1 as restDist→0
          const f  = t0 * t0 * PUSH_STR;              // quadratic falloff

          // Direction from current position for stability
          const dx   = d.x - p.sx;
          const dy   = d.y - p.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > 0.5) {
            d.vx += (dx / dist) * f;
            d.vy += (dy / dist) * f;
          } else {
            // Dot exactly at cursor — use rest direction
            if (restDist > 0.5) {
              d.vx += (rdx / restDist) * f;
              d.vy += (rdy / restDist) * f;
            }
          }
        }
      }

      /* ── Spring return to rest ── */
      d.vx += (d.rx - d.x) * SPRING_K;
      d.vy += (d.ry - d.y) * SPRING_K;

      /* ── Damping + integrate ── */
      d.vx *= DAMPING;
      d.vy *= DAMPING;
      d.x  += d.vx;
      d.y  += d.vy;

      /* ── Wave opacity (keyed to rest position for stable field) ── */
      const wave  = 0.5 + 0.5 * Math.sin(d.rx * WAVE_FX + d.ry * WAVE_FY + t * WAVE_SPD);
      const waveA = A_MIN + wave * (A_MAX - A_MIN);

      /* ── Fade: cursor void (use rest position — void stays put) ── */
      let maxFade = 0;
      for (const p of pointers.values()) {
        const dx   = d.rx - p.sx;
        const dy   = d.ry - p.sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const raw  = Math.max(0, 1 - dist / FADE_RADIUS);
        const fade = raw * raw * (3 - 2 * raw);       // smoothstep → clean edge
        if (fade > maxFade) maxFade = fade;
      }

      /* ── Vertical fade — grid dissolves into the next section ── */
      const yRaw   = Math.max(0, (d.ry / H - VFADE_START) / (1 - VFADE_START));
      const yFade  = yRaw * yRaw * (3 - 2 * yRaw);   // smoothstep 0→1

      const alpha = waveA * (1 - maxFade * 0.5) * (1 - yFade);
      if (alpha < 0.005) continue;                    // skip invisible dots

      ctx.beginPath();
      ctx.arc(d.x, d.y, DOT_R, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${IR},${IG},${IB},${alpha})`;
      ctx.fill();
    }
  }

  raf = requestAnimationFrame(render);
})();

/* ============================================================
   15. SCROLL TRIGGER REFRESH
   Called after fonts + images are loaded so element dimensions
   are stable. On touch, ensures any triggers already past their
   start point on page load fire their onEnter immediately.
   ============================================================ */

window.addEventListener('load', () => {
  ScrollTrigger.refresh();
});
