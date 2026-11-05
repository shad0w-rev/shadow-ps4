# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Shadow is a self-hosted PS4 & PS5 jailbreak exploit host. It serves a landing page to the PS4's WebKit browser where the user picks an exploit + payload, then launches the exploit chain. It combines four third-party exploit repos into one unified UI.

## Running the Server

```bash
python serve.py          # port 8000
python serve.py 8080     # custom port
```

The server binds `0.0.0.0` — point the PS4 browser to `http://<host-ip>:<port>/`. No build step, no dependencies beyond Python 3.

## Architecture

Three files make up the Shadow landing page:

- **`index.html`** — static shell, loads `style.css` and `shadow.js`
- **`style.css`** — all styling, CSS custom properties on `:root`
- **`shadow.js`** — firmware detection, exploit/payload selection, routing

`shadow.js` owns all state: `EXPLOITS[]` and `PAYLOADS[]` arrays define the available options. It detects firmware from the PS4 user agent (`PlayStation 4/XX.XX`), renders cards into `#exploit-list` and `#payload-list`, and navigates to the chosen exploit's `index.html` when the user launches.

### Firmware Encoding

Firmware versions are stored as `major * 100 + minor` (e.g., 11.02 → `1102`, 9.00 → `900`). Each exploit has `fwMin`/`fwMax` in this format plus a human-readable `fwLabel` string.

### Exploit Routing

Each exploit lives in its own directory under `exploits/` and is a self-contained static site copied from its upstream repo. Shadow navigates to it with query params:

- **Most exploits**: `exploits/<name>/index.html?payload=<path>&shadow=1`
- **Afterglow** (special case): routes to `jb.html` with `?mode=goldhen` for GoldHEN or `?payload=<path>` for others

### Exploit Directories (do not restructure)

| Directory | Exploit | FW Range | Module System |
|---|---|---|---|
| `exploits/cssfontface/` | CSSFontFace UAF | 6.00–11.02 | Classic `<script>` |
| `exploits/psfree-lapse/` | PSFree + Lapse | 7.00–9.60 | ES modules (`.mjs`) |
| `exploits/psfree900/` | PSFree 9.00 | 9.00 | ES modules (`.mjs`) |
| `exploits/afterglow/` | Afterglow | 11.00–14.00 | Classic `<script>` |

These are vendored third-party code. Edit them only for integration fixes, not refactoring.

### Payloads

`.bin` files in `payloads/`. The landing page sends HEAD requests to check availability and greys out missing ones. To add a payload: drop the `.bin` in `payloads/`, then add an entry to the `PAYLOADS[]` array in `shadow.js`.

## Serve.py MIME Types

The server sets specific MIME types the PS4 browser requires:
- `.js` and `.mjs` → `text/javascript` (ES modules need this)
- `.bin` → `application/octet-stream`
- `.appcache` → `text/cache-manifest`

Code/payloads get `Cache-Control: no-cache`; images/fonts get `max-age=604800`.

## PS4 Browser Constraints

The PS4 runs an older WebKit engine. When editing the landing page:
- Use `var`, not `let`/`const`
- No arrow functions, template literals, or destructuring in `shadow.js`
- No modern CSS (`gap` in flex is okay, but avoid `aspect-ratio`, `container queries`, `:has()`)
- ES modules (`.mjs`) work — but only some exploit sub-pages use them, not the landing page
- `localStorage` is available but can throw in some contexts — wrap in try/catch
