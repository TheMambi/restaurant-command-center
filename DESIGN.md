# DESIGN.md: Restaurant Command Center

The design system for this dashboard. Tokens live in [`src/styles/tokens.css`](src/styles/tokens.css); components in [`src/styles/app.css`](src/styles/app.css); the drawings in [`src/render/visuals.ts`](src/render/visuals.ts).

## 1. Visual theme

The pass during service. The page is the dark steel counter under a heat lamp, and everything the owner reads lies on it as a lit sheet: the score on its plate, this week's tickets hanging from the rail, the tables. The landing hero's rendered frames show that scene in 3D, with the week's three jobs on one ticket and the report's sheets rising behind it; the rest of the site is the same counter seen from above, where each job hangs on its own ticket.

Two objects carry the identity:

- **The rail of tickets.** "Do these first" is three receipt-paper tickets tucked under a steel rail, each hanging a little off square, numbered in ink blue.
- **The score plate.** The score sits in a ring that fills clockwise like the rim of a plate, with the six parts on a wheel beside it.

## 2. Colour palette and roles

All colours are OKLCH tokens. Nothing outside `tokens.css` names a colour. The same names mean different things in two contexts, so a component never needs to know where it sits.

| Context | Where | Ink | Accent |
|---|---|---|---|
| Stage | the page itself: bars, mastheads, tabs, section titles | light ink on warm charcoal | the lamp's ember, for controls and the open tab |
| Sheet | any `.sheet`: cards, stat tiles, the weights, sample plates | dark ink on paper (light mode) or light ink on dark steel (dark mode) | ink blue, for data |
| Ticket | `.ticket`, the call to action | dark ink on receipt yellow, in both modes | ink blue |

| Token | Role |
|---|---|
| `--color-stage` | the counter; the hero frames settle to it at every edge, so never change it without a re-render |
| `--color-lamp` | controls, the open tab, focus on the stage, the sample-data flag. Never data, never status |
| `--color-accent` | data: the plate's rim, bars, lines, the wheel, numbered actions |
| `--color-rival` | the competitor's bars and "even" |
| `--color-good` / `--color-warn` / `--color-bad` and their `-soft` tints | status only, always beside a word |
| `--color-ticket` | the tickets and the call to action |

Light and dark change the sheets only. The stage, the tickets and the lamp are the same in both. Printing turns the whole page into ink on white.

## 3. Typography

- **Fraunces** (variable, self-hosted, optical-size axis) for the restaurant name, section titles, every large figure and the landing headlines. Set light (360 to 450) with tight tracking.
- **Onest** (variable, self-hosted) for labels, controls, tables and small figures. Tabular numerals everywhere.
- Scale: 13, 14, 16, 18, 22 px for text; the restaurant name up to 84 px; landing section titles up to 72 px and the hero title up to 128 px, all fluid.
- Labels and table heads are sentence case, untracked and muted. No uppercase labels.

## 4. Components

- **Sheet:** `--sheet` paper with an 18px radius, a one-pixel top highlight and a long soft shadow, so it reads as lying on the counter. Everything with data sits on one.
- **Score plate (`dial`):** SVG ring from 0 at the top, clockwise to the score, with tick marks every 2.5 and the figure in Fraunces at the centre. Used for the overview score and the landing's sample plates.
- **Wheel (`radar`):** the six parts on spokes, 0 at the centre and 100 at the rim, each labelled with its name and figure. The table beside it holds the same numbers and is what screen readers get.
- **Rail and tickets:** a steel bar with three tickets under it. Each ticket has a large numeral, a dashed tear line, the action, why it ranks, and time and cost. The torn foot is a mask; the shadow is a drop shadow on the wrapper so it follows the tear.
- **Split bar (`segments`):** one bar divided by count (done, partly done, missing; ahead, even, behind) with a sentence above it and each count in words below it.
- **Status:** a pill in the status's soft tint holding a mark (✓, !, ✗) and the word. Colour never carries meaning alone.
- **Stat tile:** a sheet with a label, a large Fraunces figure, one plain note and, on the Progress tab, a sparkline.
- **Table:** 2px ink rule under the head, hairlines between rows, numbers right-aligned.
- **Meter:** a 10px bar on a rounded track, filled from zero. The competitor's uses `--color-rival`.
- **Line chart:** one series, one y-axis, a soft fill under the line, a ring on the latest point with its value. A hidden table carries the numbers. If the axis doesn't start at zero, a caption says so.
- **Bar chart:** bars from zero with the value above each.
- **Steps, milestones:** numbered stops on a line, each stop tinted by how it is going; dated stops on a line.
- **Levels, not fake numbers:** estimates show as High, Medium or Low, with a note on where a real figure would come from.

Drawings are SVG built from attributes. The site's Content-Security-Policy refuses inline styles, so nothing may use a `style` attribute.

## 5. Layout

- Container capped at 80rem and centred.
- Report: top bar (wordmark, restaurant picker, light/dark, print), masthead with the restaurant's name large, tab row, then the open tab's sheets.
- Overview: the score sheet (plate, then the reading and the wheel, then the parts table), the rail of three tickets, then ratings beside the analyst notes.
- Two-column grids collapse to one under 60rem; the score sheet drops its table to a second row under 68rem.

## 6. Depth and light

One light, from above and a little left: a warm pool at the top of the page, a faint cool rim at the right, and brushed grain on the counter. Sheets cast a long soft shadow; tickets hang in front of them and cast a longer one. Nothing glows. Printing removes all of it.

## 7. Do's and don'ts

**Do**
- Lead with what the owner should do next.
- Show every number with its label and unit.
- Keep data on sheets, so its colours always sit on a known ground.
- Mark sample data on the page, in the footer and in the progress note.

**Don't**
- Put the lamp's ember on data or status, or ink blue on anything meaning good or bad.
- Platform brand colours on bars or text.
- Invented precision: a 0 to 100 figure with no method behind it.
- Dual y-axes or pies. The plate's ring always runs 0 to 100.
- Uppercase tracked labels or emoji as icons.
- Motion for decoration. Motion answers the visitor: the landing hero plays as they scroll, a panel settles in when its tab is chosen and its bars, ring and wheel draw once, a ticket straightens under the pointer. Reduced motion turns all of it off.

## Logo

A kitchen ticket on ink: three ruled lines and a short ink-blue line for the one thing to do.

## Landing page

- **Order:** a dark bar pinned to the top; a pinned hero that plays the 120-frame sequence across about three and a half screens of scroll, with four blocks of words beside it; then, on the same stage, the weights sheet (one bar cut into six slices, and the six parts), two sample restaurants each on a sheet with its plate, wheel and first job, and four rules the numbers keep, each with a small drawing; then the closing call to action under the lamp.
- **Before the script:** the page arrives with the hero's four blocks of words in order at their natural height, and stays that way if the script never runs. `noscript` lines say what is missing. `landing.ts` then turns on the pinned stage (`is-live`) or, with reduced motion, the finished frame beside the words (`is-still`).
- **Frames:** 16:9 frames (3200 wide on high-density screens, 2560 otherwise) cover screens wider than 1.45:1 and crop from the empty left side. Squarer and portrait screens, and a phone held sideways, get 4:5 frames, fitted on the right of a landscape screen or at the bottom of a portrait one, so the words never sit on the scene.
- **Words in the hero** stay in a left column (`min(24rem, 33vw)`); on portrait screens they sit above the frame.
- **Figures** come from the same scoring code and config as the report, and the plates and wheels are drawn by the report's own functions. The frames bake in Brasa Taquería's report; a test fails if that report changes without a re-render.
- **Bar:** pinned and solid, with no blur or see-through. The frames are composed to stay clear of it.
- **Frame fitting:** wide frames cover the screen. Screens wider than the frame fit its height under the bar. Tall frames fit into the space the words leave, and where a frame stops short of the screen its own edge carries on outward and eases into the stage. Nothing is painted over the frame.
- **Frames as files:** AVIF, with a WebP of the finished frame for browsers without AVIF.
- **Frames in memory:** a window of decoded frames around the scroll position, up to 256 MB on a desktop and 64 MB for the 4:5 frames and for any device that reports 4 GB of memory or less.

## 8. Responsive behaviour

- Under 60rem: grids stack, the tickets hang one under another and hang straight, the picker loses its visible label (it keeps an accessible one).
- Under 40rem: the wordmark shows only the logo, meter columns hide (the numbers stay), wide tables restack into labelled rows, stat tiles go two across, and the words inside drawings are set larger because the drawings scale down.
- The tab row scrolls sideways instead of wrapping. The open tab scrolls into view clear of the edge fade.
- Short landscape screens: the landing bar slims, display sizes follow the screen's height.
- Print: every section in order on white, sheets as hairline boxes, tickets as dashed boxes, controls hidden.

## 9. Agent prompt guide

When extending this dashboard:

1. Add data to the profile schema in `src/schema.ts` first; let TypeScript types follow.
2. Render with the `html` tag and put it on the page with `setHtml` (both in `src/html.ts`). Never assign to `innerHTML`.
3. Put data on a `.sheet`. Reuse `dial`, `radar`, `segments`, `sparkline`, `meter`, `status`, `stat` and `lineChart` before inventing a component.
4. Use tokens only. No `style` attributes: draw with SVG attributes or classes.
5. Write screen text in plain sentences: no field names, enum values or jargon.
6. Run `npm run check` and look at both modes, a 390px-wide screen and print before calling it done.
