# Acclimate Archery — "Bow Hunting: Elevated"

Custom-built site for Jake Bell's archery business in Steamboat Springs, CO.
Zero dependencies — pure HTML / CSS / vanilla JS (canvas + raw WebGL). Fonts load
from Google Fonts (Archivo · Instrument Serif · Space Grotesk).

## Run locally

Any static server works:

```
npx serve .        # or
python -m http.server 3000
```

Then open http://localhost:3000.

## Structure

```
index.html      — the whole landing page (sections are clearly commented)
css/style.css   — design system + all section styles (tokens at the top in :root)
js/main.js      — interaction engine (each module is labeled in a banner comment)
images/         — (create this) drop real photography here
```

## Dropping in real photos (8–10 planned)

Marked slots, all commented in `index.html`:

1. **Hero** — add `<img class="hero__photo" src="images/hero.jpg" alt="">` as the
   first child of `.hero__scene`. The procedural ridge layers, mist, and snow
   composite on top of it.
2. **Portrait (The Builder)** — replace the `.craft__portrait-ph` block with
   `<img src="images/jake.jpg" alt="Jake Bell at the bench">`. The parallax and
   frame styling apply automatically.
3. Additional photos: any `.service-card`, testimonial, or new section can take an
   image — keep them inside a container with `overflow: hidden` and reuse
   `data-parallax-img` for the scroll drift effect.

## Adding the 3–4 future pages

- Copy `index.html`, keep `<head>`, header, footer, cursor/preloader markup.
- Nav links currently anchor to sections (`#what-we-do`, `#territory`, `#craft`,
  `#contact`); switch them to `services.html`, `areas.html`, etc. when the pages
  exist — the `site-nav__num` numbering is built for it.
- Every section is self-contained: eyebrow (`.section__eyebrow`) + title
  (`data-split-title`) + content. Reuse those primitives for visual consistency.

## Things to replace before launch

- **Phone number** — `(970) 555-0134` is a placeholder (marked in the HTML).
- **Email** — `jake@acclimatearchery.com` is assumed; update the `mailto:`.
- **Testimonials** — all three are placeholders (marked with an HTML comment).
- Verify brand partner URLs (Option Archery, GAS Bowstrings, AAE, PSE).

## Design system quick reference

- Palette: `--void #0e0d0c`, `--coal #191715`, `--bone #ece9e2`,
  `--paper #f2f0ea`, `--ash #a39e94`, `--ember #e4572e` (accent — use sparingly).
- Type: Archivo (wide, 800+) for display caps · Instrument Serif italic for the
  "elevated" accent words · Space Grotesk for labels/body.
- Motion honors `prefers-reduced-motion` (all canvas/WebGL layers disable).
