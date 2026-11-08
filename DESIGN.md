# DESIGN.md: Restaurant Command Center

The design system for this dashboard, in the nine-section DESIGN.md format. Tokens live in [`src/styles/tokens.css`](src/styles/tokens.css); components in [`src/styles/app.css`](src/styles/app.css).

## 1. Visual theme

A restaurant's report card. Warm paper and near-black ink, ruled like a ledger, with one ink blue (the colour of a fountain pen on a ledger) that marks the score, the bars and the current tab. Red, amber and green are reserved for status, so a bar never reads as a warning. The signature object is the ticket: this week's three actions printed like an order on the pass. It should feel like something an owner would print and pin by the pass, not a neon analytics console. Restraint is the point: the numbers carry the page.

The landing page sets the same objects on a dark stage, lit like a product shot: the ticket lies on a counter under a soft warm key light, then lifts and the report unfolds behind it as the visitor scrolls. After that one moment, the page returns to paper.

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
| `--color-stage` | deep warm charcoal, same in both modes | the landing page's hero and closing; the rendered frames settle to it at every edge |
| `--color-stage-ink` / `-muted` / `-rule` / `-accent` | light ink, grey, hairline and ink blue for the stage | words and controls on the stage |
| `--color-cta` / `--color-cta-ink` | receipt paper and ink | the one call to action on the stage |
| `--color-bar` | paper at about 80% | the report's see-through top bar |

Dark mode re-derives every token (paper about 17% lightness, ink about 94%, accent lighter and less saturated). The hue never moves between modes. A small script sets the mode before first paint from the saved choice or the system setting, and printing always uses light.

## 3. Typography

Type scale note: body steps (13, 14, 16, 18, 22) follow roughly a 1.125 to 1.2 ratio. The restaurant name (40 to 60) and the score (92) jump on purpose so the two things that matter most lead the page. The landing page adds two display steps: section titles up to 72 and the hero title up to 128.


- **Fraunces** (variable, self-hosted, with its optical-size axis) for the restaurant name, the score figure, section titles and every landing headline. At display sizes the optical-size axis switches to Fraunces's high-contrast cut; set light (350 to 450) with tight tracking. Section titles inside the report stay at 600.
- **Onest** (variable, self-hosted) for everything else: labels, controls, table cells, figures. Tabular numerals everywhere.
- Scale: 13, 14, 16, 18, 22 px; the restaurant name at `clamp(40px, 4.4vw, 60px)`; the score at 92 px. Landing: `--text-section` up to 72 px and `--text-hero` up to 128 px, both fluid.
- Labels and table heads are sentence case, untracked, a step smaller and muted. No uppercase labels.

## 4. Components

- **Sections sit on the paper.** A section is a title over a ruled table or list, with no box around it, like a page of a ledger. Only two objects get their own surface and lift off the page: the score card (`paper-2`, 1px rule border, 14px radius, `--shadow-lift`) and the ticket (`--shadow-ticket`, applied to a `.ticket-lift` wrapper because the ticket's perforated edge is a mask that would clip its own shadow).
- **Controls:** pill-shaped (`--radius-control`) buttons and picker; the picker draws its own chevron. On the landing page, the call to action is receipt paper on the stage and the second action is an outlined pill.
- **Table:** full width, 2px ink rule under the head, 1px hairlines between rows, no vertical lines. Numbers right-aligned.
- **Meter:** 10px bar on a rounded `paper-3` track, filled with the accent from zero, drawn with `transform: scaleX`. The competitor's meter uses `--color-rival`.
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

Soft studio light from above, and only on the two raised objects. `--shadow-lift` pairs a tight contact shadow with a wide, faint fall-off; `--shadow-ticket` does the same as drop shadows that follow the ticket's perforated edge. In dark mode the shadows deepen and the score card gets a one-pixel top highlight, so elevation still reads as lightness. Tables, notes and everything else stay flat on the paper. Printing removes every shadow.

The landing hero is the one place with real lighting: rendered frames of the ticket and the report lit by a warm key from the front left and a cool rim from behind, with soft blurred shadows on the counter and the key's fall-off as the vignette (see `hero-sequence/`).

## 7. Do's and don'ts

**Do**
- Lead with what the owner should do next.
- Show every number with its label and unit, in tabular figures.
- Mark sample data on the page, in the footer and in the progress note.
- Keep one accent; let neutral carry everything else.

**Don't**
- Visible gradients, glows, or a purple-to-blue anything. The only gradient is the hero frames' vignette, which settles to `--color-stage` so nobody sees an edge.
- Coloured side stripes on notes or callouts. A note is a hairline box on `paper-2`.
- Platform brand colours on bars or text, or the accent on anything that means good or bad.
- Invented precision: a 0 to 100 figure with no method behind it.
- Dual y-axes, pies, donuts or gauges.
- Uppercase tracked labels, emoji as icons, or decorative dots.
- Animation for decoration. Motion answers the visitor: the landing hero plays as they scroll, its title rises in once on load, a report panel settles in (320ms) and its bars fill (720ms) when its tab is chosen, and hovers change colour in 120ms. Reduced motion turns all of it off, and the hero shows its finished frame.

## Logo

A kitchen ticket on ink: three ruled lines and a short ink-blue line for the one thing to do. No gauge, no ring.

## Landing page

- **Order:** a see-through dark bar pinned to the top; a pinned hero that plays the 120-frame sequence across about three and a half screens of scroll, with four blocks of words that fade in and out beside it; then three ledger sections on paper (the six score parts, the two sample restaurants, how the numbers stay honest); then a dark closing bookend with the call to action.
- **Frames:** 16:9 frames (2560 wide, sharp on high-density screens) cover screens wider than 1.45:1 and crop from the empty left side. Squarer and portrait screens get 4:5 frames, fitted on the right of a landscape screen or at the bottom of a portrait one, so the words never sit on the scene.
- **Words in the hero** stay in a left column (`min(24rem, 33vw)`); on portrait screens they sit above the frame.
- **Figures** on the landing page come from the same scoring code and config as the report. The frames themselves bake in Brasa Taquería's report; a test fails if that report changes without a re-render.
- **Colour:** the hero and the closing use the stage tokens whatever the visitor's mode; the ledger sections follow the light or dark choice made in the report, on `--color-paper-2` in dark mode so the change of scene stays visible.
- **Bar:** pinned, see-through stage over the hero and the closing; paper and ink over the ledger sections. The frames are composed to stay clear of it.
- **Frames as files:** AVIF (smooth in the dark counter where WebP breaks into blocks), with a WebP of the finished frame for browsers without AVIF.

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
