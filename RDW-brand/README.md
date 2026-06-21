# RDW — Brand Package

**Railway Deployment Watcher** — a developer dashboard for monitoring Railway deployments across projects.

The mark fuses **converging rails** (railway / track) with a **green status dot** (a live deployment signal) into one minimal glyph that stays legible down to 16px.

---

## Files

### `svg/` — vector source (scale to any size)
| File | Use |
|------|-----|
| `rdw-icon.svg` | Primary square app icon — indigo tile |
| `rdw-icon-mono.svg` | Square app icon — near-black tile |
| `rdw-mark-indigo.svg` | Standalone mark for light backgrounds |
| `rdw-mark-white.svg` | Standalone mark for dark backgrounds |
| `rdw-lockup-light.svg` | Horizontal RDW lockup for light backgrounds |
| `rdw-lockup-dark.svg` | Horizontal RDW lockup for dark backgrounds |
| `rdw-favicon.svg` | Favicon-optimized icon (heavier strokes) |

### `png/` — raster exports
| File | Use |
|------|-----|
| `favicon-16.png` / `-32.png` / `-48.png` | Browser favicons |
| `apple-touch-icon-180.png` | iOS home-screen icon |
| `rdw-icon-512.png` | App stores / large display (indigo) |
| `rdw-icon-mono-512.png` | App stores / large display (near-black) |

---

## Palette
| Token | Hex | Role |
|-------|-----|------|
| Indigo | `#4F46E5` | Primary brand |
| Status | `#22C55E` | Live / healthy signal accent |
| Ink | `#14152B` | Near-black surfaces & mono tile |
| Paper | `#FFFFFF` | Light surfaces & on-indigo marks |

## Typography
- **Wordmark:** Space Grotesk 700
- **Tagline / UI:** IBM Plex Mono 400–500

## Clearspace & minimum size
- Keep clearspace ≥ the height of the green status dot on all sides.
- Minimum mark size: 16px. Below 24px use `rdw-favicon.svg` (heavier strokes).

## Web usage
```html
<link rel="icon" type="image/svg+xml" href="svg/rdw-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="png/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="png/apple-touch-icon-180.png">
```

> Lockup SVGs embed a Google Fonts `@import`, so the wordmark renders correctly in any browser. For offline/print use, convert text to outlines in your vector editor.
