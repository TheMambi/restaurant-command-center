# Known pitfalls

Symptom, cause and fix for traps this project has already hit. Read before touching the area named.

| Area | Symptom | Cause | Fix |
|---|---|---|---|
| Profiles | Schema rejects a profile with "Star counts average … too far from the Google rating" | The five star counts don't average to the rating shown (allowed drift is 0.05) | Adjust the counts; keep their total equal to the Google review count |
| Profiles | Schema rejects a "Fix soon" gap | Every entry in `summary.criticalGaps` needs an action due now or soon whose `fixesGap` repeats it word for word | Add or edit the matching opportunity's `fixesGap` |
| Profiles | Progress chart jumps after a scoring change | Past scores in `history` are recorded values; only the current month is computed | After changing `scoring.config.ts`, recheck each sample profile's recorded history so the trend still makes sense |
| Profiles | Schema rejects history with "Review totals can only grow" | A month's total is lower than the month before, or than today's platform totals | Fix the totals; the new-reviews bar chart depends on them rising |
| Tests | A profile test fails on `sampleData` | Every committed profile must be marked as sample data | Keep it `true`; real data belongs in a private fork |
| Styles | A table overflows on phones | Wide tables need `stack-table` and `data-label` on each cell, plus `hide-narrow` on bar columns | Add both; check at 320px with no sideways scroll |
| Styles | Hover or print colours look wrong in dark mode | Colours set outside `tokens.css`, or a missing dark token | Only use `var(--color-*)`; add new tokens to both the light and dark blocks |
| Print | Report prints dark | `data-mode` stays dark | `main.ts` switches to light on `beforeprint`; keep that listener |
| Git | The private source folder shows up as untracked | It sits inside the repo folder on the owner's Mac | It is listed in `.git/info/exclude`; never `git add -A` without checking `git status` first |
| Landing | Test "were drawn from the figures the app computes" fails | A profile or scoring change moved Brasa Taquería's figures, and the hero frames still show the old ones | Update `hero-sequence/content.json` from the test's diff, then re-render (`hero-sequence/README.md`) |
| Landing | A visible line where the hero meets the next section | The frames' edges no longer match `--color-stage` | Re-render after changing that token; the vignette in `hero-sequence/*.html` settles every edge to it |
| Landing | The closing words overlap the ticket on some laptops | 16:9 frames cropped to a squarer screen pull the scene left | `framingFor` switches to the 4:5 frames below 1.45:1; keep the hero text column at `min(24rem, 33vw)` |
| Landing | A render stops with `render_cancelled_parent_exited` | HyperFrames cancels a render when the shell that started it exits | Run it in a terminal that stays open, or as one foreground command |
| Review | Screenshots show half-filled bars or a blank hero | Full-page captures freeze CSS animations and break the pinned hero | Take viewport screenshots after scrolling to each part |
| Links | Old shared links (`/?r=…&tab=…`) land on the landing page | The report moved to `/report/` | The inline script at the top of `index.html` forwards them; keep it |
| Landing | The hero's call to action can't be reached with Tab, or a click at the top of the page opens the report | Faded blocks of words all share one grid cell; `visibility: hidden` drops them from focus and screen readers, and without `pointer-events: none` an invisible link catches clicks | Keep `.beat.is-off { pointer-events: none }` and the `focusin` handler in `landing.ts` that scrolls to a focused block |
| Styles | A see-through bar shows text sharp behind it in the built site | Writing `-webkit-backdrop-filter` after `backdrop-filter` makes the minifier keep only the prefixed copy | Write `backdrop-filter` alone; a test in `tests/landing.test.ts` refuses the prefixed form |
| Print | The ticket prints with its shadow | `.ticket-lift` is defined after the print block, so a print reset of equal weight loses | The print reset uses `.scorecard .ticket-lift` |
| Landing | The hero's plates slide under the pinned top bar | The frames were composed for the full screen height | The wide camera keys carry a `lift`; `cameraAt` widens the lens by the same factor so the lift moves the picture down without zooming in |
| Landing | The dark counter shows blocks and bands | WebP splits low-contrast darks into 16px blocks at any quality | Frames are AVIF with full-resolution colour; `end.webp` is the fallback for browsers without AVIF |
| Styles | Phone tables show meters and cut off columns at 390px | A new `@media` block was pasted inside the 40rem block, moving its rules to a narrower breakpoint | Keep each breakpoint's rules in one block; a test checks the phone rules sit under 40rem |
| Landing | Two blocks of hero words show at once, both half faded | A fade that starts before a block's range and ends after it overlaps the next block | `beatOpacity` fades inside each range; a test sweeps the scroll and allows one block at a time |
| Landing | A grey smear in the bar where the hero meets paper | The bar's backdrop blur mixes the dark stage and the paper behind it | The landing bar is nearly opaque with no blur and takes the look of the section just below it |
| Landing | With reduced motion the finished frame slides under the words | The stage grows taller than the screen, and covering it scales the frame up | The still canvas keeps one screen's height |

