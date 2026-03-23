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
// Touch devices: phones, all iPad orientations, and any coarse-pointer
// device (touchscreen laptops, Surface, etc.) regardless of width.
const isMobile            = window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches;

/* ============================================================
   1. LENIS — weighted smooth scroll
   ============================================================ */

const lenis = new Lenis({
  lerp:          isMobile ? 1    : 0.08,  // native scroll on mobile
  smoothWheel:   !isMobile,
  orientation:   'vertical',
  wheelMultiplier: 0.85,
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
   Desktop: scrub-driven against tall sticky panel dwell height.
   Touch (phone + iPad): each section owns its background-color
   directly. This guarantees the correct bg is visible as soon
   as the section enters the viewport — before any content —
   because the section's padding-top is blank colored space.
   No scrub, no IntersectionObserver race conditions.
   ============================================================ */

const pageBg = document.getElementById('page-bg');

// Build ordered list of all [data-bg] sections
const bgSections = Array.from(document.querySelectorAll('[data-bg]'));

// Set initial page-bg color immediately (used by desktop scrub + hero area)
if (bgSections.length) gsap.set(pageBg, { backgroundColor: bgSections[0].dataset.bg });

if (!isMobile) {
  // ── Desktop: scrub fromTo per section ──────────────────────
  bgSections.forEach((section, i) => {
    const fromBg = i === 0 ? section.dataset.bg : bgSections[i - 1].dataset.bg;
    const toBg   = section.dataset.bg;

    gsap.fromTo(pageBg,
      { backgroundColor: fromBg },
      {
        backgroundColor: toBg,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          end:   'top 15%',
          scrub: 1,
        },
      }
    );
  });

} else {
  // ── Touch / tablet: stamp bg-color directly on each section ──
  // Sections become self-contained colored blocks. As the user
  // scrolls, the section's own padding-top (72px of solid color)
  // appears before any content — bg always leads content.
  bgSections.forEach((section) => {
    section.style.backgroundColor = section.dataset.bg;
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

/* ============================================================
   4. LENIS VARIABLE WEIGHT
   ============================================================ */

['panel--leadership', 'panel--beliefs-full'].forEach((cls) => {
  document.querySelectorAll('.' + cls).forEach((panel) => {
    ScrollTrigger.create({
      trigger: panel,
      start: 'top 60%',
      end:   'bottom 40%',
      onEnter:     () => { lenis.options.lerp = 0.06; },
      onLeave:     () => { lenis.options.lerp = 0.08; },
      onEnterBack: () => { lenis.options.lerp = 0.06; },
      onLeaveBack: () => { lenis.options.lerp = 0.08; },
    });
  });
});

/* ============================================================
   5. HERO — load animation (identity: AGUSTIN SANCHEZ.)
   ============================================================ */

gsap.from('.hero-headline .line-mask span', {
  yPercent: 110,
  duration: 1.0,
  ease: 'power3.out',
  stagger: 0.1,
  delay: 0.25,
});

gsap.from('#hero-strip', {
  opacity: 0,
  y: 20,
  duration: 0.9,
  ease: 'power2.out',
  delay: 1.0,
});

/* ============================================================
   6. LEADERSHIP PANEL BUILD-ON
   Label → headline lines → body text (right col stagger)
   ============================================================ */

const leaderPanel = document.querySelector('.panel--leadership');
if (leaderPanel) {
  const trigger = { trigger: leaderPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const label   = leaderPanel.querySelector('.intro-label');
  const spans   = leaderPanel.querySelectorAll('.leadership-headline .line-mask span');
  const paras   = leaderPanel.querySelectorAll('.body-para');
  const photo   = leaderPanel.querySelector('.leadership-image');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }
  if (photo) {
    gsap.set(photo, { opacity: 0, scale: 1.03 });
    gsap.to(photo, { opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.2, scrollTrigger: trigger });
  }
  if (spans.length) {
    gsap.from(spans, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.12,
      scrollTrigger: trigger,
    });
  }
  if (paras.length) {
    gsap.set(paras, { opacity: 0, y: 24 });
    gsap.to(paras, {
      opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', stagger: 0.18, delay: 0.4,
      scrollTrigger: trigger,
    });
  }
  const leaderNote = leaderPanel.querySelector('.org-intro-note');
  if (leaderNote) {
    gsap.set(leaderNote, { opacity: 0, y: 14 });
    gsap.to(leaderNote, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 1.1, scrollTrigger: trigger });
  }
}

/* ============================================================
   7. ORG WORK — two panel build-ons
   ============================================================ */

// Panel 1: label + XL headline
const orgIntroPanel = document.querySelector('.panel--org-intro');
if (orgIntroPanel) {
  const trigger = { trigger: orgIntroPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const label   = orgIntroPanel.querySelector('.org-label');
  const spans   = orgIntroPanel.querySelectorAll('.org-intro-lines .line-mask span');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }
  if (spans.length) {
    gsap.from(spans, {
      yPercent: 110, duration: 1.0, ease: 'power3.out', stagger: 0.09, delay: 0.12,
      scrollTrigger: trigger,
    });
  }
  const orgIntroNote = orgIntroPanel.querySelector('.org-intro-note');
  if (orgIntroNote) {
    gsap.set(orgIntroNote, { opacity: 0, y: 14 });
    gsap.to(orgIntroNote, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', delay: 0.5, scrollTrigger: trigger });
  }
}

// Panel 2: muted lines, then red lines
const orgStatPanel = document.querySelector('.panel--org-statement');
if (orgStatPanel) {
  const trigger      = { trigger: orgStatPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const mutedSpans   = orgStatPanel.querySelectorAll('.org-lines--muted .line-mask span');
  const accentSpans  = orgStatPanel.querySelectorAll('.org-lines--accent .line-mask span');

  if (mutedSpans.length) {
    gsap.from(mutedSpans, {
      yPercent: 110, duration: 0.95, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: trigger,
    });
  }
  if (accentSpans.length) {
    gsap.from(accentSpans, {
      yPercent: 110, duration: 0.95, ease: 'power3.out', stagger: 0.08, delay: 0.3,
      scrollTrigger: trigger,
    });
  }
  const orgStatNotes = orgStatPanel.querySelectorAll('.org-intro-note');
  if (orgStatNotes.length) {
    gsap.set(orgStatNotes, { opacity: 0, y: 14 });
    gsap.to(orgStatNotes, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, delay: 0.65, scrollTrigger: trigger });
  }
}

/* ============================================================
   8. BELIEFS PANEL BUILD-ON
   Label → headline → both columns together (slight offset)
   ============================================================ */

const beliefsPanel = document.querySelector('.panel--beliefs-full');
if (beliefsPanel) {
  const trigger = { trigger: beliefsPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const label   = beliefsPanel.querySelector('.intro-label');
  const hlSpans = beliefsPanel.querySelectorAll('.beliefs-headline .line-mask span');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }
  if (hlSpans.length) {
    gsap.from(hlSpans, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.1,
      scrollTrigger: trigger,
    });
  }

  // Both columns build on together with a small offset
  beliefsPanel.querySelectorAll('.belief-col').forEach((col, i) => {
    const colLabel   = col.querySelector('.principle-label');
    const colSpans   = col.querySelectorAll('.principle-headline .line-mask span');
    const colBody    = col.querySelector('.principle-body');
    const offset     = i * 0.1;

    if (colLabel) {
      gsap.set(colLabel, { opacity: 0 });
      gsap.to(colLabel, {
        opacity: 0.55, duration: 0.5, ease: 'power2.out',
        delay: 0.45 + offset, scrollTrigger: trigger,
      });
    }
    if (colSpans.length) {
      gsap.from(colSpans, {
        yPercent: 110, duration: 0.85, ease: 'power3.out', stagger: 0.06,
        delay: 0.55 + offset, scrollTrigger: trigger,
      });
    }
    if (colBody) {
      gsap.set(colBody, { opacity: 0, y: 18 });
      gsap.to(colBody, {
        opacity: 1, y: 0, duration: 1.0, ease: 'power3.out',
        delay: 0.85 + offset, scrollTrigger: trigger,
      });
    }
  });
}

/* ============================================================
   9. CURIOSITY PANEL BUILD-ON
   ============================================================ */

const curiosityPanel = document.getElementById('p-curiosity');
if (curiosityPanel) {
  const trigger = { trigger: curiosityPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const label   = curiosityPanel.querySelector('.principle-label');
  const spans   = curiosityPanel.querySelectorAll('.principle-headline .line-mask span');
  const body    = curiosityPanel.querySelector('.principle-body');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }

  // Scale pulse on the XL block
  gsap.from(curiosityPanel.querySelector('.principle-headline--xl'), {
    scale: 1.02, duration: 1.4, ease: 'power3.out', scrollTrigger: trigger,
  });

  if (spans.length) {
    gsap.from(spans, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.072, delay: 0.1,
      scrollTrigger: trigger,
    });
  }
  if (body) {
    gsap.set(body, { opacity: 0, y: 18 });
    gsap.to(body, {
      opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 0.35,
      scrollTrigger: trigger,
    });
  }
}

/* ============================================================
   10. THE GAP PANEL BUILD-ON
   ============================================================ */

const gapPanel = document.getElementById('p-gap');
if (gapPanel) {
  const trigger  = { trigger: gapPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const label    = gapPanel.querySelector('.principle-label');
  const hlSpans  = gapPanel.querySelectorAll('.principle-headline .line-mask span');
  const subSpans = gapPanel.querySelectorAll('.principle-subhead .line-mask span');
  const body     = gapPanel.querySelector('.principle-body');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }
  if (hlSpans.length) {
    gsap.from(hlSpans, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.1,
      scrollTrigger: trigger,
    });
  }
  if (subSpans.length) {
    gsap.from(subSpans, {
      yPercent: 110, duration: 0.88, ease: 'power3.out', stagger: 0.065, delay: 0.35,
      scrollTrigger: trigger,
    });
  }
  if (body) {
    gsap.set(body, { opacity: 0, y: 18 });
    gsap.to(body, {
      opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 0.55,
      scrollTrigger: trigger,
    });
  }
}

/* ============================================================
   11. PROJECTS — headline build-on + staggered rows
   Normal scroll, no sticky panel
   ============================================================ */

const projectsSection = document.querySelector('.projects-section');
if (projectsSection) {
  const trigger       = { trigger: projectsSection, start: 'top 60%', toggleActions: 'restart none none reset' };
  const label         = projectsSection.querySelector('.intro-label');
  const headlineSpans = projectsSection.querySelectorAll('.projects-headline .line-mask span');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }
  if (headlineSpans.length) {
    gsap.from(headlineSpans, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.1,
      scrollTrigger: trigger,
    });
  }
}

// Project rows stagger
gsap.set('.project-row', { opacity: 0, y: 14 });
gsap.to('.project-row', {
  opacity: 1, y: 0,
  duration: 0.75, ease: 'power3.out', stagger: 0.085, delay: 0.3,
  scrollTrigger: {
    trigger: '.projects-table',
    start: 'top 75%',
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

/* ============================================================
   11b. VALIDATED DELIVERY — Panel A (belief statement)
   ============================================================ */

const deliveryPanel = document.getElementById('p-delivery');
if (deliveryPanel) {
  const trigger  = { trigger: deliveryPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const label    = deliveryPanel.querySelector('.principle-label');
  const hlSpans  = deliveryPanel.querySelectorAll('.principle-headline .line-mask span');
  const subSpans = deliveryPanel.querySelectorAll('.principle-subhead .line-mask span');
  const body     = deliveryPanel.querySelector('.principle-body');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }
  if (hlSpans.length) {
    gsap.from(hlSpans, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.1,
      scrollTrigger: trigger,
    });
  }
  if (subSpans.length) {
    gsap.from(subSpans, {
      yPercent: 110, duration: 0.88, ease: 'power3.out', stagger: 0.065, delay: 0.35,
      scrollTrigger: trigger,
    });
  }
  if (body) {
    gsap.set(body, { opacity: 0, y: 18 });
    gsap.to(body, {
      opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 0.55,
      scrollTrigger: trigger,
    });
  }
}

/* ============================================================
   11c. VALIDATED DELIVERY — Panel B (Signal-Based Decision System)
   ============================================================ */

const frameworkPanel = document.getElementById('p-framework');
if (frameworkPanel) {
  const trigger  = { trigger: frameworkPanel, start: 'top 40%', toggleActions: 'restart none none reset' };
  const label    = frameworkPanel.querySelector('.principle-label');
  const hlSpans  = frameworkPanel.querySelectorAll('.principle-headline .line-mask span');
  const phases   = frameworkPanel.querySelectorAll('.delivery-phase');

  if (label) {
    gsap.set(label, { opacity: 0 });
    gsap.to(label, { opacity: 0.55, duration: 0.55, ease: 'power2.out', scrollTrigger: trigger });
  }
  if (hlSpans.length) {
    gsap.from(hlSpans, {
      yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.07, delay: 0.1,
      scrollTrigger: trigger,
    });
  }
  if (phases.length) {
    gsap.set(phases, { opacity: 0, y: 12 });
    gsap.to(phases, {
      opacity: 1, y: 0, duration: 0.75, ease: 'power3.out', stagger: 0.09, delay: 0.45,
      scrollTrigger: trigger,
    });
  }
}

/* ============================================================
   12b. AI PROCESS MATRIX — staggered build-on
   Phase headers animate first, then each discipline row
   cascades in. Human cells reach full opacity; AI cells land
   at 0.38 (dimmed) to reinforce the visual language.
   ============================================================ */
const aiMatrixPanel = document.getElementById('p-ai-matrix');
if (aiMatrixPanel && !prefersReducedMotion) {
  const trigger    = { trigger: aiMatrixPanel, start: 'top 45%', toggleActions: 'restart none none reset' };
  const eyebrow    = aiMatrixPanel.querySelector('.principle-label');
  const thesis     = aiMatrixPanel.querySelector('.ai-frame__thesis');
  const phHeaders  = aiMatrixPanel.querySelectorAll('.ai-m__ph');
  const discLabels = aiMatrixPanel.querySelectorAll('.ai-m__disc');
  const hCells     = aiMatrixPanel.querySelectorAll('.ai-m__cell--h');
  const aiCells    = aiMatrixPanel.querySelectorAll('.ai-m__cell--ai');
  const legend     = aiMatrixPanel.querySelector('.ai-frame__legend');

  // Eyebrow — 0.75 element opacity on var(--paper) gives ~9.65:1 on ink, AAA
  if (eyebrow) {
    gsap.set(eyebrow, { opacity: 0 });
    gsap.to(eyebrow, { opacity: 0.75, duration: 0.5, ease: 'power2.out', scrollTrigger: trigger });
  }
  // Thesis — query updated; element no longer uses .ai-frame__thesis so this is a no-op guard
  if (thesis) {
    gsap.set(thesis, { opacity: 0, y: 6 });
    gsap.to(thesis, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.1, scrollTrigger: trigger });
  }
  // Phase header columns — slide up, staggered L→R
  if (phHeaders.length) {
    gsap.set(phHeaders, { opacity: 0, y: 10 });
    gsap.to(phHeaders, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.07, delay: 0.25, scrollTrigger: trigger });
  }
  // Discipline labels — 0.75 opacity on var(--paper) = ~9.65:1 on ink, AAA
  if (discLabels.length) {
    gsap.set(discLabels, { opacity: 0 });
    gsap.to(discLabels, { opacity: 0.75, duration: 0.5, ease: 'power2.out', stagger: 0.18, delay: 0.55, scrollTrigger: trigger });
  }
  // Human cells — full weight, staggered across grid
  if (hCells.length) {
    gsap.set(hCells, { opacity: 0, y: 6 });
    gsap.to(hCells, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.05, delay: 0.6, scrollTrigger: trigger });
  }
  // AI cells — animate to opacity: 1; CSS color rgba(244,242,238,0.75) handles the visual
  // dimming (9.65:1 on ink). Stacking GSAP opacity on top of CSS color opacity caused
  // effective alpha of 0.285 which produced a contrast ratio of ~1.7:1, failing AAA.
  if (aiCells.length) {
    gsap.set(aiCells, { opacity: 0, y: 6 });
    gsap.to(aiCells, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.05, delay: 0.7, scrollTrigger: trigger });
  }
  // Legend
  if (legend) {
    gsap.set(legend, { opacity: 0 });
    gsap.to(legend, { opacity: 1, duration: 0.5, ease: 'power2.out', delay: 1.1, scrollTrigger: trigger });
  }
}

/* ============================================================
   13. PANEL EXIT — fade + blur all sticky panels on scroll-out
   Scrub-driven, bidirectional. Fires during the final portion
   of each panel's scroll travel as content retreats upward.
   Mobile: skipped — panels are natural block elements (no dwell
   height), so scrub timings are meaningless and content would
   flash-fade incorrectly.
   ============================================================ */

if (!isMobile) document.querySelectorAll('.panel').forEach((panel) => {
  const content = panel.querySelector('.panel__content');
  if (!content) return;

  const isHero = panel.classList.contains('panel--hero');

  gsap.fromTo(content,
    { opacity: 1, filter: 'blur(0px)' },
    {
      opacity: 0,
      filter: 'blur(10px)',
      ease: 'power2.in',  // slow start, fast end — content lingers then snaps away
      scrollTrigger: {
        trigger: panel,
        start: isHero ? 'bottom 45%' : 'bottom 65%',
        end:   'bottom 5%',
        scrub: 0.4,
      },
    }
  );
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
   14. HERO CANVAS WAVE — WebGL SDF light ribbon
   Two overlapping sine-wave ribbons rendered via SDF glow.
   Orange (#FF6930 family). Mouse-interactive with lerped spring.
   Pauses via IntersectionObserver when hero is off-screen.
   Skipped if prefers-reduced-motion or WebGL unavailable.
   ============================================================ */

(function initHeroWave() {
  if (prefersReducedMotion) return;

  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return;

  /* ---- Vertex shader: full-screen quad pass-through ---- */
  const vertSrc = `
    attribute vec2 a_pos;
    void main() {
      gl_Position = vec4(a_pos, 0.0, 1.0);
    }
  `;

  /* ---- Fragment shader: 2D SDF wave with glow ---- */
  const fragSrc = `
    precision highp float;

    uniform float u_time;
    uniform vec2  u_resolution;
    uniform vec2  u_mouse;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution;

      /* Aspect-corrected centred coordinates */
      float aspect = u_resolution.x / u_resolution.y;
      vec2 p;
      p.x = (uv.x - 0.5) * aspect;
      p.y = (1.0 - uv.y) - 0.5;

      /* Mouse in same space */
      vec2 m;
      m.x = (u_mouse.x / u_resolution.x - 0.5) * aspect;
      m.y = (1.0 - u_mouse.y / u_resolution.y) - 0.5;

      /* Wave paths — mouse shifts Y centre */
      float mi = m.y * 0.25;
      float w1 = sin(p.x * 4.5 + u_time * 0.7)  * 0.06
               + sin(p.x * 2.2 - u_time * 0.35) * 0.04
               + mi;
      float w2 = sin(p.x * 3.0 + u_time * 1.0 + 1.6) * 0.04
               + sin(p.x * 7.0 - u_time * 0.55) * 0.02
               + mi * 0.5;

      /* SDF glow — primary + secondary ribbon */
      float d1   = abs(p.y - w1);
      float d2   = abs(p.y - w2);
      float glow = 0.0035 / (d1 + 0.008)
                 + 0.0015 / (d2 + 0.012);
      glow = clamp(glow, 0.0, 1.0);

      /* Orange (#FF6930) + analog film grain */
      vec3 col = vec3(1.0, 0.412, 0.188) * glow;
      col += hash(uv * 800.0 + u_time) * 0.035 * glow;

      gl_FragColor = vec4(col, glow * 0.88);
    }
  `;

  /* ---- Compile helpers ---- */
  function compileShader(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('Hero wave shader error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }

  const vert = compileShader(gl.VERTEX_SHADER,   vertSrc);
  const frag = compileShader(gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('Hero wave link error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  /* ---- Full-screen quad (two triangles) ---- */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,   1, -1,  -1,  1,
     1, -1,   1,  1,  -1,  1,
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  /* ---- Uniform locations ---- */
  const u_time = gl.getUniformLocation(prog, 'u_time');
  const u_res  = gl.getUniformLocation(prog, 'u_resolution');
  const u_mouse = gl.getUniformLocation(prog, 'u_mouse');

  /* ---- Blending: premultiplied alpha ---- */
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  /* ---- State ---- */
  const mouse       = { x: 0, y: 0 };
  const mouseTarget = { x: 0, y: 0 };
  let raf     = null;
  let visible = true;
  let t0      = null;

  /* ---- Resize ---- */
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform2f(u_res, canvas.width, canvas.height);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /* ---- Mouse ---- */
  window.addEventListener('mousemove', (e) => {
    mouseTarget.x = e.clientX;
    mouseTarget.y = e.clientY;
  });

  /* ---- IntersectionObserver: pause RAF when hero off-screen ---- */
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

    /* Lerp mouse toward cursor (5% per frame ≈ spring lag) */
    mouse.x += (mouseTarget.x - mouse.x) * 0.05;
    mouse.y += (mouseTarget.y - mouse.y) * 0.05;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(prog);
    gl.uniform1f(u_time,  (ts - t0) * 0.001);
    gl.uniform2f(u_mouse, mouse.x, mouse.y);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
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
  ScrollTrigger.refresh(true);
});
