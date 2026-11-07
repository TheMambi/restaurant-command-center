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
