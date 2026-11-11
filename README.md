# Acclimate Archery — "Bow Hunting: Elevated"

Custom-built site for Jake Bell's archery business in Steamboat Springs, CO.
Zero dependencies — pure HTML / CSS / vanilla JS (canvas + raw WebGL). Fonts are
self-hosted in `fonts/` (Archivo · Space Grotesk, SIL Open Font License — see
`fonts/OFL.txt`). The site loads nothing from any third party.

Live at https://acclimatearchery.com (Vercel project `acclimate-archery`, deploys
from `main` on GitHub).

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
privacy.html    — privacy notice (linked from the footer)
css/fonts.css   — @font-face rules for the self-hosted fonts
css/style.css   — design system + all section styles (tokens at the top in :root)
js/main.js      — interaction engine (each module is labeled in a banner comment)
Images/         — photography, plus grain.svg (hero texture)
fonts/          — woff2 font files + OFL license
favicon.svg
vercel.json     — security headers (see below)
.vercelignore   — keeps *.md notes, tool folders and .env files out of deploys
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

## Things to confirm with Jake

- **Testimonials** — the HTML labels all three as real Google reviews. Confirm
  each one matches the Google review word for word, with the reviewer's name.
- **Brands section** — eyebrow says "Partners". Only keep that if Jake has a
  formal relationship with each brand; otherwise use neutral wording.
- **"Acclimate Archery LLC"** in the footer — confirm the LLC is registered.

## Store (removed for now)

The Shopify merch store (Merch section, Buy SDK, `js/shopify-store.js`) was removed
in commit `4e82576` ("Remove the Shopify store until it's set up") because the
store didn't exist yet and the SDK was unpinned and deprecated. To bring the old
code back as a starting point:

```
git show 4e82576^:js/shopify-store.js
git show 4e82576 -- index.html css/style.css js/main.js   # the removed markup/CSS/JS
```

When the store returns, use a current Shopify integration (not the retired JS
Buy SDK checkout), pin the script to an exact version, add its hosts to the CSP,
and update `privacy.html` (Shopify, cart storage).

## Security headers

`vercel.json` applies these headers to every route:

| Header | Value / purpose |
| --- | --- |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains`, HTTPS only |
| X-Content-Type-Options | `nosniff` |
| X-Frame-Options | `DENY`, can't be framed (clickjacking) |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Permissions-Policy | camera, mic, location, payment, USB etc. all disabled |
| Content-Security-Policy | see below |

**CSP:** `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors
'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self';
connect-src 'self'; manifest-src 'self'; form-action 'none'; upgrade-insecure-requests`

Everything comes from the site's own origin. That means:

- **No inline `<script>` code and no `style="…"` attributes, and no `on…=`
  handlers.** Put JS in `js/` and CSS in `css/`. Setting `el.style.x = …` from JS
  is fine. (The JSON-LD `<script type="application/ld+json">` block is data, not
  code, so the CSP doesn't apply to it.)
- **If you ever must add an inline script:** compute its hash and add it to
  `script-src`:
  ```
  printf '%s' "<exact script contents between the tags>" | openssl dgst -sha256 -binary | openssl base64
  ```
  then use `script-src 'self' 'sha256-<that value>'`. Any change to the script,
  even whitespace, changes the hash, so recompute it every time.
  Chrome's console also prints the exact hash it expected when it blocks one.
- **Adding a third-party service** (embed, form provider, store, map): add its
  exact host to the matching directive (`script-src`, `frame-src`,
  `connect-src`, `img-src`, `form-action`…), never `*`, and update `privacy.html`.
- After any change, open the site with DevTools open and check the console for
  CSP errors. A broken CSP fails silently: the page looks fine but its JS is dead.

## Privacy page

`privacy.html` is built from what the site actually does (no forms, cookies,
analytics or browser storage; Vercel hosting logs; Cal.com booking; Gmail).
If you add anything that collects data, update it and its "Last updated" date.
It's currently marked **DRAFT** (banner + `noindex`) until Jake approves it.
Remove both once he does.

## Design system quick reference

- Palette: `--void #0e0d0c`, `--coal #191715`, `--bone #ece9e2`,
  `--paper #f2f0ea`, `--ash #a39e94`, `--ember #e4572e` (accent — use sparingly).
- Type: Archivo (wide, 800+) for display caps · Space Grotesk for labels/body.
- Muted text uses `--ash-2` (light sections) and `--ash-2-on-dark` (swapped in
  automatically inside dark sections) so it meets WCAG AA contrast.
- Motion honors `prefers-reduced-motion` (canvas/WebGL layers, counters, the
  specialties auto-cycle and the preloader all switch off).
