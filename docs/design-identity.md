# HayFlow — Design Identity

## Brand idea

**Agricultural craft meets modern software.**

HayFlow is used by growers, dealers, drivers — people who work with their hands, know their land, and don't want to be talked down to. But they're tired of agricultural software that looks like it was built in 2004. We give them something that feels like a good tool: warm, sturdy, honest, and uncommonly well-made.

**Not**: shiny tech bro, cute farm clipart, corporate ag conglomerate.
**Yes**: the feel of a well-worn leather notebook, a clean truck dashboard, a craft bourbon label, Linear's precision filtered through Patagonia's warmth.

## Voice

- **Grounded.** Plain language. "Bales moved" not "units transacted."
- **Confident.** Short sentences. No hedging. "Approve" not "Would you like to approve?"
- **Warm.** Address the user like a peer, not a customer. "Nothing here yet — add your first barn" not "No records to display."
- **Practical.** Numbers first, explanations second. Show the total, then explain how.

## Palette

The default theme is **Harvest** — warm amber + deep pine + cream, with a secondary theme **Pine** for anyone who prefers dark.

### Harvest (light — default)

| Token | Hex | Use |
|---|---|---|
| `--bg-deep` | `#F7F2E7` | page background (warm canvas) |
| `--bg-surface` | `#FFFFFF` | cards, inputs |
| `--primary` | `#B45309` | primary actions, active states (amber 700) |
| `--primary-light` | `#D97706` | hover, highlights (amber 600) |
| `--primary-glow` | `rgba(180, 83, 9, 0.22)` | button shadow |
| `--accent` | `#1F3A2E` | headings, emphasis (deep pine) |
| `--text-main` | `#1C1917` | body text (stone 900) |
| `--text-dim` | `#78716C` | secondary text (stone 500) |
| `--glass-bg` | `rgba(255, 255, 255, 0.82)` | translucent cards |
| `--glass-border` | `rgba(28, 25, 23, 0.08)` | hairlines |
| `--success` | `#16803C` | approved, paid |
| `--warning` | `#B45309` | pending |
| `--error` | `#B91C1C` | rejected, errors |

### Pine (dark — alt)

| Token | Hex | Use |
|---|---|---|
| `--bg-deep` | `#0F1A14` | page (deep pine) |
| `--bg-surface` | `#18251D` | cards |
| `--primary` | `#D97706` | amber 600 |
| `--primary-light` | `#F59E0B` | amber 500 |
| `--primary-glow` | `rgba(245, 158, 11, 0.28)` | glow |
| `--accent` | `#FDE68A` | highlight (amber 200) |
| `--text-main` | `#F5F1E6` | cream |
| `--text-dim` | `#9CA393` | muted sage |
| `--glass-bg` | `rgba(15, 26, 20, 0.76)` | |
| `--glass-border` | `rgba(253, 230, 138, 0.10)` | |
| `--success` | `#4ADE80` | |
| `--warning` | `#F59E0B` | |
| `--error` | `#F87171` | |

**Other themes** (Sunset, Forest, Midnight, etc.) remain available in Settings for personal preference, but Harvest is the default marketing and first-run theme.

## Typography

- **Display / headings:** **Fraunces** (variable serif, 500–900). Warm, slightly old-world, confident. Used on marketing, dashboard hero numbers, invoice header.
- **Body / UI:** **Geist Sans** (already in Next.js default). Clean, neutral, legible at all sizes. 16px base on marketing, 18px in app for field-friendly readability.
- **Mono:** **Geist Mono** for invoice numbers, IDs, and reference codes.

Hierarchy:
- H1 (hero): Fraunces 700, 3.5–5rem, tight leading (1.05), letter-spacing -0.02em
- H2 (page): Fraunces 600, 1.75rem, leading 1.15
- H3 (card): Geist Sans 700, 1.125rem, uppercase small caps (tracking-wider)
- Label: Geist Sans 700, 0.75rem, uppercase, tracking-wider, color `--text-dim`
- Body: Geist Sans 400, 1rem / 1.125rem, leading 1.5
- Numeric: Fraunces 600 with `font-variant-numeric: tabular-nums`

## Shape & surface

- **Corners:** 12px for inputs/buttons (friendly), 24px for cards (soft), 8px for badges/chips.
- **Shadows:** soft, warm — `0 6px 20px rgba(28, 25, 23, 0.06)` on cards; primary button gets a `--primary-glow` offset shadow.
- **Borders:** 1px hairlines in `--glass-border`. Use sparingly — prefer shadow + whitespace.
- **Glass:** keep the glass-card pattern but dial back the blur on light theme; it reads better with lower saturation.

## Iconography

Lucide-react at 18–24px. Stroke width 1.75 (slightly chunkier than Lucide's default 2 feels too heavy at small sizes; 1.5 too thin). Color `currentColor` inheriting from text.

No emoji in the app UI.

## Wordmark

A text wordmark pairing **Fraunces 700** "Hay" in `--accent` with **Geist 700** "Flow" in `--primary`. Plus a simple mark: a stylized bale/stack of three horizontal bars in `--primary`, tapering like a bale profile.

See [`public/brand/`](../public/brand/) for SVG assets.

## Components

Standard utility classes (kept for continuity):
- `.glass-card` — softer shadow, lighter border in Harvest
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` — unified padding and weight
- `.input-modern`, `.select-modern`, `.label-modern` — keep existing contract
- `.chip` — new, for status badges (`.chip-success`, `.chip-warning`, `.chip-error`, `.chip-info`)
- `.hero` — landing/hero block with Fraunces H1 and accent gradient text

## Motion

Subtle. 200–300ms transitions on hover/focus. No parallax, no heavy bounces. Respect `prefers-reduced-motion` (currently not — should be added).

## Extensions (marketing site)

For the marketing landing site, extend the same palette, typography, wordmark. Add:
- Feature illustrations — line drawings in `--accent` on warm canvas, not stock photos
- Photography — if used, warm + candid + wide (barns, hands, equipment) — never staged farm people pointing at laptops
- Long-form sections with Fraunces display quotes
- Pricing table using `.glass-card` system

## Open questions

- Should there be a light/dark auto-switch (follow OS) or is default-Harvest + per-user override enough? (Recommendation: default-Harvest, per-user override; skip OS detection for now.)
- Are we comfortable with the name "HayFlow"? Strong, rhythmic, category-appropriate — keeping it unless data says otherwise.
- Mark vs wordmark on the marketing site? Start with wordmark only; introduce bale-mark when we have app icons / favicons.
