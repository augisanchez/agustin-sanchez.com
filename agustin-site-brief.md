# agustin-sanchez.com — Build Brief

## What this is

A personal website for Agustin Sanchez. One long, continuous-scroll page. Not a portfolio, not a resume site. A personal publication and leadership signal.

The site should position Agustin as an organizational leader who uses design, strategy, and cultural literacy to help organizations move. A visitor should leave thinking: *this person understands how organizations work* — not *this person runs design.*

The aesthetic target is a premium editorial publication with genuine personality — Swiss typographic discipline pushed into bold, culturally literate territory. Think Zina Gallery poster meets NPR Brand Book: structured but alive, confident but warm, precise but human.

---

## Deliverable

A modern web project built for Claude Code. Structure it however makes sense — `index.html` with linked CSS/JS, or a simple Vite project if that makes tooling cleaner. It must run via a local dev server. Do not build for `file://` protocol.

---

## Technology Stack

### Scroll — Lenis

Lenis provides smooth, momentum-based scrolling and a render loop that animation systems hook into. It is the foundation everything else builds on.

```
npm install lenis
```

Initialize before anything else:

```js
const lenis = new Lenis({
  duration: 1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);
```

### Animation — GSAP + ScrollTrigger

```
npm install gsap
```

Connect Lenis and ScrollTrigger so they share scroll position:

```js
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Use `scrub` for elements whose animation progress is directly tied to scroll position. Use `toggleActions` for elements that play once on entry.

### Fonts — Google Fonts CDN
- **Display:** Space Grotesk (300, 500, 700)
- **Body:** IBM Plex Sans (300, 400, italic)
- **Editorial accent:** Source Serif 4 (300 italic)

### Styling
Plain CSS or SCSS. No CSS frameworks. CSS custom properties for all design tokens.

---

## The Core Scroll Experience

This is the most important section of the brief. Read it before writing any code.

The page should feel like a premium editorial publication. Scroll has weight. Content arrives with intention. Nothing just appears.

The goal is an experience where the reader always feels the page responding to them — where the relationship between scroll position and what's on screen feels physical, not transactional. Like the content is attached to the scroll, not triggered by it.

**What this means in practice:**
- Scroll has momentum and natural deceleration (Lenis)
- Large headlines build line by line as they enter the viewport — they don't appear whole
- Body text follows headlines with a deliberate delay
- Elements that leave the viewport exit with the same intention they entered with
- Sections transition into each other — the page reads as one continuous document, not a deck of screens
- The entry moment of each section should feel considered — something shifts as you arrive

**What to avoid:**
- Elements that fade in all at once
- Anything that feels like a loading state
- Bounce or elastic easing
- Too many things animating simultaneously — hierarchy matters
- Scroll-jacking or fighting Lenis's momentum
- Snap scrolling of any kind

---

## Animation Principles

### Easing
Calm, weighted, engineered. Nothing bounces.

```js
ease: "power3.out"    // entrances
ease: "power2.in"     // exits
ease: "power1.inOut"  // ambient / background transitions
```

### Durations
- Hover / micro: 0.2–0.35s
- Element reveals: 0.7–1.0s
- Headline line builds: 0.6–0.85s per line
- Background transitions: 0.8–1.4s

Vary durations intentionally — identical durations flatten the rhythm.

### Hierarchy through time
Within every section, elements arrive in order:
1. Label or category marker
2. Primary headline (line by line)
3. Body text
4. Supporting details, rules, secondary elements

Stagger siblings 0.1–0.15s. Headline lines stagger 0.08–0.1s per line.

### Line-by-line headline reveals
All large headlines build line by line. Each line sits inside an `overflow:hidden` wrapper. The inner text starts at `translateY(100%)` and animates to `translateY(0)`. This is a mask reveal — the text appears to rise into place rather than fade in.

This is not optional. It's how every display headline on the page behaves.

```html
<div class="line-mask">
  <span>CLARITY</span>
</div>
```

```js
gsap.from(".line-mask span", {
  yPercent: 100,
  duration: 0.85,
  ease: "power3.out",
  stagger: 0.09,
  scrollTrigger: { trigger: ".headline", start: "top 80%" }
});
```

### Scroll-scrubbed vs triggered
Use `scrub` when the animation should feel physically attached to scroll position — parallax, progress indicators, pinned sections where content moves past.

Use `toggleActions: "play none none none"` for one-shot reveals that play once and hold.

---

## Design System

### Color

Three distinct background modes. Color is structural, not decorative.

```css
--ink:        #111111;
--paper:      #F4F2EE;
--warm-grey:  #DADAD6;
--mid:        #888884;
--red:        #FF3B30;
--yellow:     #FFD500;
--mint:       #5DE2C3;
--blue:       #1F6FFF;
```

**Background modes:**

| Mode | Color | Where |
|------|-------|--------|
| Light | `--paper` | Hero, Leadership Intro, Principles (Craft / Courage), Projects, Footer |
| Dark | `--ink` | Organizational Work |
| Field | `--yellow` | Curiosity principle block only |

The yellow field is used once and only once. It is a deliberate gear-shift — the page's single moment of full-saturation warmth. It must feel earned, not decorative.

The dark-to-yellow transition (Organizational Work → Principles → Curiosity) should feel like: night → dawn → morning. The Curiosity block is where the page breathes.

### Typography

```
Display XL:  Space Grotesk 700 / clamp(80px, 15vw, 216px) / line-height 0.88 / tracking -0.035em / uppercase
Display L:   Space Grotesk 700 / clamp(48px, 9vw, 144px)  / line-height 0.93 / tracking -0.015em / uppercase
Display M:   Space Grotesk 700 / clamp(32px, 5.5vw, 96px) / line-height 0.97 / tracking -0.01em  / uppercase
Display S:   Space Grotesk 600 / clamp(24px, 3.5vw, 64px) / line-height 1.05 / tracking -0.005em / uppercase
Body L:      IBM Plex Sans 300 / clamp(15px, 1.3vw, 20px) / line-height 1.7
Body:        IBM Plex Sans 300 / 18px                     / line-height 1.65
Caption:     IBM Plex Sans 500 / 11px / letter-spacing 0.14em / uppercase
Essay:       Source Serif 4 300 italic / clamp(16px, 1.2vw, 20px) / line-height 1.75
```

**Note:** Display XL tracking is -0.035em (tighter than original). At large scale this reads as compressed and intentional — closer to the poster references. Apply to Hero headline and Organizational Work headline specifically.

**Essay** is a new type role: Source Serif 4 italic, used for Principles body copy and the Hero sub-strip. It signals: these are things I actually believe, not copy I've polished for a pitch deck. It sounds like a person.

Add to body:
```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Layout
- Horizontal padding: `clamp(32px, 6vw, 96px)` on all sections
- Section vertical padding: `clamp(80px, 12vh, 140px)` top and bottom
- Section dividers: `1px solid rgba(17,17,17,0.1)`
- Body text: 58–64ch max-width

### Texture
SVG fractalNoise overlay on `body::before`. Opacity **5–6%**. Barely perceptible but adds print materiality and analog warmth. Photography people notice grain. It should feel like something slightly physical was used to make this page.

---

## Fixed HUD

Always visible. Position fixed, top of viewport. `z-index: 900`. `mix-blend-mode: multiply`.

**Left column — two lines:**
- Line 1: "Agustin Sanchez" — Caption style, muted
- Line 2: Tone word for the current section — Caption style, `--mid` color. Updates via ScrollTrigger as the section changes.

| Section | Tone word |
|---------|-----------|
| Hero | MIAMI |
| Leadership Intro | CRAFT + STRATEGY |
| Organizational Work | SYSTEMS |
| Principles | BELIEFS |
| Projects | WORK |
| Footer | — (hidden) |

**Right:** Current section name — updates as user scrolls via ScrollTrigger.

The tone word is the small detail that rewards close reading. Executives who notice it will find it considered. Those who don't still get the section name.

---

## Page Sections

### 1 — Hero

The only section that is exactly `100vh`. Everything else is as tall as it needs to be.

The headline dominates the viewport. It is the entire point of this section.

```
CLARITY
CHANGES       ← --red
EVERY
THING.
```

Display XL with -0.035em tracking. Lines reveal immediately on page load — do not wait for scroll. This is the first thing the visitor sees. It must land.

Below the headline: a two-column strip with a hairline top rule. Left: what Agustin does. Right: how he works. **Essay style (Source Serif 4 italic).** Fades in after headline completes (~500ms delay).

---

### 2 — Leadership Intro

Two-column layout. Left column holds a large headline and is `position:sticky` while the right column scrolls. The sticky headline presides over everything in the right column.

**Important:** `position:sticky` only works reliably when the scroll container is `html`/`body` — which it is with Lenis. Also requires `align-self: start` on the sticky element when used inside CSS Grid.

**Headline (sticky left):** DESIGN IS NOT JUST ABOUT WHAT WE MAKE.

**Right column contents (in order):**

1. **Photograph** — One of Agustin's own photographs. Full column width. Desaturated to ~85% — not black and white, not full color. Between print and memory. This is the first image on the page. It establishes that a human made this.

2. **Type/photo collision** — The sticky left headline should optically extend across the column boundary, sitting over the top edge of the photograph by a small amount. The type and image share the same plane. They are in conversation, not separated into boxes.

3. **Body copy** — 3 paragraphs in IBM Plex Sans 300. Follows the photograph. The body text should feel like it arrives from behind the image as you scroll.

Body paragraphs: Agustin at the intersection of design, strategy, and human dynamics. Photography, music, and writing as leadership practice — how creative cross-training keeps perception sharp when organizations are moving fast.

---

### 3 — Organizational Work

The only dark section. `--ink` background.

The transition into this section should feel ambient — a slow background crossfade as it enters the viewport (0.8–1.4s ease), not an abrupt cut. The darkness should arrive before the content, like the lights going down.

Two stacked headlines — first pair in `--paper`, second pair in `--red`:
```
ORGANIZATIONS DON'T STALL
BECAUSE OF BAD IDEAS.
THEY STALL WHEN
ALIGNMENT BREAKS DOWN.
```

Display XL with -0.035em tracking. Lines build in sequence.

Followed by a two-column body in `rgba(244,242,238,0.65)` — muted paper tone, not full white, not grey. The mutedness signals: these are real observations, not proclamations.

---

### 4 — Principles

One continuous section. Four editorial blocks in sequence, separated by hairline rules. They read as a single editorial sequence — not four separate slides.

**Alternating layout logic:** Odd blocks (Craft, Curiosity) are left-dominant. Even blocks (Courage, The Gap) are right-dominant. The rhythm should feel like a series — considered variation, not arbitrary difference.

Each block: label animates first, then headline lines, then body.

Body copy for all four blocks is **Essay style (Source Serif 4 italic)** — not IBM Plex Sans. These are beliefs, not bullet points.

---

**Craft** — Left-dominant: headline left (Display M), body right (bottom-aligned, Essay)
Background: `--paper`
Label: `--mid`
Headline: CRAFT IS NECESSARY. IT'S JUST NOT ENOUGH.

---

**Courage** — Right-dominant: body left (Essay), headline right (Display M)
Background: `--paper`
Label: `--mid`
Headline: THE BEST ANSWERS LIVE IN UNCOMFORTABLE PLACES.

---

**Curiosity** — Full field. Background: `--yellow`. This is the one moment of full saturation on the page.

Layout: The Display XL headline is centered and allowed to break beyond the standard horizontal padding — it runs nearly edge-to-edge, as if it needed more room than the grid allows. The body drops back to the standard column width below it, centered.

The text color flips to `--ink` (black on yellow). The label is in `--ink` at reduced opacity.

Headline: STAY IN THE QUESTION LONGER.

**The yellow section should feel like relief after the dark Organizational Work section and the restrained Craft/Courage blocks. It is the warmest moment on the page.**

Transition out: as this section scrolls out, the background crossfades back to `--paper` (0.8s ease).

---

**The Gap** — Left-dominant: stacked headline then accent subhead then Essay body
Background: `--paper`
Label: `--mid`
Headline (Display M): MOST ORGANIZATIONS DON'T HAVE A DESIGN PROBLEM.
Subhead (Display S, `--red`): THEY HAVE A TRANSLATION PROBLEM.

---

### 5 — Projects

An editorial index. Five rows. Visible column structure — thin vertical hairlines divide each row into its four components (number / name / description / arrow). The grid is structural and visible. This is the Zina Gallery moment on the page: information as architecture.

**Row structure:**
```
[number]   [name]            [description]         [→]
```

Hairline vertical dividers between columns. Hairline horizontal rules between rows. The grid makes the projects feel like a curated inventory, not a list of links.

**Hover state:** All *inactive* rows drop to 0.35 opacity. The *hovered* row holds full opacity and receives a very subtle background wash in its assigned accent color at 6% opacity — just enough warmth to feel alive. Arrow nudges `translate(3px, -3px)`. Transition: 0.25s ease.

Rows stagger in on scroll entry (0.08s stagger per row).

| # | Name | Description | Accent | URL |
|---|------|-------------|--------|-----|
| 01 | The Gap | Writing on design, strategy, and organizations | --red | https://byagustin.substack.com |
| 02 | The Photographic Journal | A record of looking | --mint | https://thephotographicjournal.com |
| 03 | Mixcloud | Two decades of sets | --yellow | https://www.mixcloud.com/augisanchez/ |
| 04 | Photography | Instagram | --mid | https://www.instagram.com/byagustin |
| 05 | LinkedIn | Professional network | --blue | https://www.linkedin.com/in/agustinsanchez |

---

### 6 — Footer

Two-column. Hairline top border. Left: name + role. Right: © 2026 · Made in Miami.

**Personal line:** One short, personal line sits below the two-column content, full width, in Essay style (Source Serif 4 italic), `--mid` color. This is the last thing a visitor reads. It should sound like a person, not a brand. TBD — to be written with final copy.

**AS watermark:** The letters **AS** rendered at ~25vw in `--warm-grey` at 8% opacity, positioned right-aligned and bottom-anchored behind the footer content. `z-index: 0`, footer content at `z-index: 1`. Not a logo. Not a brand mark. A found object. The kind of detail that rewards someone who looks closely.

---

## What Doesn't Work (do not revisit)

- **scroll-snap** — feels like PowerPoint. Removed.
- **position:sticky inside a custom overflow:scroll div** — breaks silently in Chrome.
- **Manual rAF loop reading scrollTop** — fights Lenis. Let Lenis and ScrollTrigger handle scroll state.
- **GSAP UMD inlined on file:// protocol** — fails silently. Not relevant with a dev server, but documented for reference.

---

## What Success Looks Like

A visitor scrolls through the page and feels like they're reading something — not clicking through screens, not watching a demo. The scroll has weight. The content has presence. Typography does most of the work. Animation supports it without performing.

The page has three emotional registers: warm and direct (Hero, Leadership Intro), precise and serious (Organizational Work), alive and personal (Curiosity block, Footer). A visitor moves through all three without noticing the transitions — only noticing that the page felt like one complete thing.

Remove all animation and the page should still feel complete. Motion is an accent. The design is the thing.

---

## Copy Status

The following sections need final copy before build is complete:

| Section | Status |
|---------|--------|
| Hero sub-strip (left: what I do / right: how I work) | Needs drafting |
| Leadership Intro — 3 body paragraphs | Needs drafting |
| Organizational Work — 2-column body | Needs drafting |
| Principles — body copy for all 4 blocks (Essay style) | Needs drafting |
| Footer personal line | Needs drafting |
| Photograph selection for Leadership Intro | Needs selection |

---

## Opening Prompt for Claude Code

Start the session with:

> Build the website described in agustin-site-brief.md. Start by setting up the project with Lenis and GSAP/ScrollTrigger configured correctly and connected to each other. Then build the Hero section and get the headline reveal working before moving on. Confirm each section is working before continuing to the next.
