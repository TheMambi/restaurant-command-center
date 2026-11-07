# DESIGN.md: Restaurant Command Center

The design system for this dashboard, in the nine-section DESIGN.md format. Tokens live in [`src/styles/tokens.css`](src/styles/tokens.css); components in [`src/styles/app.css`](src/styles/app.css).

## 1. Visual theme

A restaurant's report card. Warm paper and near-black ink, ruled like a ledger, with one ink blue (the colour of a fountain pen on a ledger) that marks the score, the bars and the current tab. Red, amber and green are reserved for status, so a bar never reads as a warning. The signature object is the ticket: this week's three actions printed like an order on the pass. It should feel like something an owner would print and pin by the pass, not a neon analytics console. Restraint is the point: the numbers carry the page.

## 2. Colour palette and roles

All colours are OKLCH tokens. Nothing outside `tokens.css` names a colour.

| Token | Light | Role |
|---|---|---|
| `--color-paper` | warm off-white | page ground |
| `--color-paper-2` | near white | cards |
| `--color-paper-3` | light warm grey | meter tracks, notes |
| `--color-ink` | warm near-black | text, strong rules |
| `--color-ink-2` | dark warm grey | secondary text |
| `--color-muted` | mid warm grey (4.5:1 or better) | labels, captions |
| `--color-rule` | pale warm grey | hairlines between rows |
| `--color-accent` | ink blue | the score, bars, selected tab, numbered actions |
| `--color-ticket` | receipt yellow | the "Do these first" ticket |
| `--color-rival` | neutral grey | the competitor's bars |
| `--color-good` / `--color-warn` / `--color-bad` | green, amber, red | status marks only, always beside a word |

Dark mode re-derives every token (paper about 17% lightness, ink about 94%, accent lighter and less saturated). The hue never moves between modes. A small script sets the mode before first paint from the saved choice or the system setting, and printing always uses light.

## 3. Typography

Type scale note: body steps (13, 14, 16, 18, 22) follow roughly a 1.125 to 1.2 ratio. The restaurant name (36) and the score (64) jump on purpose so the two things that matter most lead the page.


- **Fraunces** (variable, self-hosted) for the restaurant name and section titles. Sentence case, weight 600, slight negative tracking.
- **Onest** (variable, self-hosted) for everything else: labels, controls, table cells, figures. Tabular numerals everywhere.
- Scale: 13, 14, 16, 18, 22, 36 px, plus 64 px for the one hero figure (the score).
- Labels and table heads are sentence case, untracked, a step smaller and muted. No uppercase labels.

## 4. Components

- **Sections sit on the paper.** A section is a title over a ruled table or list, with no box around it, like a page of a ledger. Only two objects get their own surface: the score card (`paper-2`, 1px rule border, 8px radius) and the ticket.
- **Table:** full width, 2px ink rule under the head, 1px hairlines between rows, no vertical lines. Numbers right-aligned.
- **Meter:** 10px bar on a `paper-3` track, filled with the accent from zero, drawn with `transform: scaleX`. The competitor's meter uses `--color-rival`.
- **Status:** a mark (✓, !, ✗) in its status colour followed by the word (Done, Partly done, Missing). Colour never carries meaning alone.
- **Stat row:** label, large figure, one plain-English note ("Up 9 points since May 2026"). No icons, no arrows.
- **Ticket:** receipt-yellow paper with perforated top and bottom edges and a dashed tear line under the heading. Holds the action list: numbered in the accent, title, one-sentence description, time and cost as a definition list. Used once per page.
- **Line chart:** inline SVG, one series, one y-axis, 2px accent line, 4 to 5 gridlines, value on the last point. A hidden table carries the same numbers for screen readers. If the axis doesn't start at zero, a caption says so.
- **Bar chart:** inline SVG, bars from zero, at most 24px wide, value above each bar. Used for counts per month.
- **Levels, not fake numbers:** estimates such as search demand or growth potential show as High, Medium or Low, with a note on where a real figure would come from.

## 5. Layout

- Container capped at 76rem and centred; gutters grow on wide screens, the grid does not.
- Top bar: wordmark, restaurant picker, light/dark toggle, print. Then the masthead (restaurant name, one-sentence description, sample-data flag) and a tab row.
- Overview: the score card on the left, spanning two rows; the ticket and the ratings table on the right; analyst notes below. The score card also says which way the score is moving and how the restaurant stands against its competitor.
- Two-column grids collapse to one column under 60rem.

## 6. Depth and elevation

Flat. The score card separates from the page by a lighter surface and a hairline; the ticket by its own paper and perforated edges. No shadows. In dark mode, elevation is lightness: cards are lighter than the ground.

## 7. Do's and don'ts

**Do**
- Lead with what the owner should do next.
- Show every number with its label and unit, in tabular figures.
- Mark sample data on the page, in the footer and in the progress note.
- Keep one accent; let neutral carry everything else.

**Don't**
- Gradients, glows, or a purple-to-blue anything.
- Coloured side stripes on notes or callouts. A note is a hairline box on `paper-2`.
- Platform brand colours on bars or text, or the accent on anything that means good or bad.
- Invented precision: a 0 to 100 figure with no method behind it.
- Dual y-axes, pies, donuts or gauges.
- Uppercase tracked labels, emoji as icons, or decorative dots.
- Animation for decoration. Motion is limited to 120ms colour changes on hover.

## Logo

A kitchen ticket on ink: three ruled lines and a short ink-blue line for the one thing to do. No gauge, no ring.

## 8. Responsive behaviour

- Under 60rem: grids stack, the picker loses its visible label (it keeps an accessible one).
- Under 40rem: the wordmark shows only the logo, meter columns hide (the numbers stay), wide tables restack into labelled rows, stat rows stack, cards tighten, and the tab row fades at the edge to show it scrolls.
- The tab row scrolls sideways instead of wrapping.
- Print: every section prints in order, one section per page, on light paper, controls hidden.

## 9. Agent prompt guide

When extending this dashboard:

1. Add data to the profile schema in `src/schema.ts` first; let TypeScript types follow.
2. Render with the `html` template in `src/html.ts` so profile text is escaped.
3. Reuse `card`, `table`, `meter`, `status`, `stat` and `lineChart` before inventing a component.
4. Use tokens only. If a new colour seems necessary, it is probably a status or the accent.
5. Write screen text in plain sentences: no field names, enum values or jargon.
6. Run `npm run check` and look at both modes and a 390px-wide screen before calling it done.
