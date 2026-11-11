# CLAUDE.md: Restaurant Command Center

Operating instructions for Claude Code and Cowork sessions in this repo. Section 0
holds the project specifics; they **override** the shared baseline that follows.

This file biases toward **caution over speed**. For trivial tasks (a typo, an
obvious one-liner), use judgment — not every change needs the full rigor.

---

## 0. Project Specifics

- **Project:** Restaurant Command Center. A public portfolio piece: a report card for a restaurant's online presence, rendered from one JSON profile per restaurant. Fictional sample restaurants only.
- **Stack:** Vite + TypeScript (no framework), Zod, Vitest with jsdom and axe-core, hand-written SVG charts, self-hosted Fraunces and Onest fonts, Motion for the landing page's scroll. npm. Two pages: the landing page (`index.html`) and the report (`report/index.html`).
- **Hero frames:** `public/hero/` holds 120 rendered frames per framing. Their source is `hero-sequence/` (three.js in a HyperFrames composition, its own `package.json`); re-render after changing `--color-stage` or Brasa Taquería's figures.
- **Hosting:** static build (`dist/`) on Vercel. No backend, database, cache or env vars.
- **Default branch:** `dev`. `main` is production; merge to it only with the owner's OK.
- **Session-start reading, in order:** `README.md` (what it is, scoring method, decisions), `DESIGN.md` (the design system), `docs/PITFALLS.md` (known traps), `src/schema.ts` (the data contract), `src/scoring.config.ts` (every tunable number). Confirm where the project stands before changing anything.
- **Out of scope:** live data pulls, logins, a backend, real restaurant data.
- **Commands:** `npm run dev` (local), `npm run check` (type check + tests + production build; the gate before every push), `npm run preview` (serve the build).

### Project rules (override the baseline below where they conflict)

- **Never real restaurant data (HARD).** This repo is public. Profiles must be fictional and marked `"sampleData": true`; a test enforces it. Never add names, addresses, ratings, photos, logos or scraped data from a real business, and never mention the private source project in commits, code or docs. Private material kept beside the code on the owner's Mac is listed in `.git/info/exclude`; check `git status` before every commit and never stage it.
- **Data flows one way.** Profile JSON → `parseProfile` (Zod) → scoring and insight functions → `render/*` → `html` tag. Add fields to the schema first and let types follow. All profile text goes through the escaping `html` tag, and markup reaches the page only through `setHtml` (`src/html.ts`); never assign to `innerHTML`.
- **Numbers live in config.** Score weights, targets, bands, the "Do these first" ranking and comparison thresholds live in `src/scoring.config.ts`. Change them there, then update README's scoring table and the sample profiles' recorded history if scores shift.
- **Design system.** Follow `DESIGN.md`: the page is a dark stage and data sits on `.sheet`s; colours and fonts only through tokens in `src/styles/tokens.css`; the lamp's ember for controls, ink blue for data, neither on anything meaning good or bad; status always shows a word beside its colour; bars start at zero; one y-axis per chart; estimates as High/Medium/Low, never invented 0 to 100 figures.
- **Security (HARD).** `vercel.json` sends a Content-Security-Policy with no inline scripts, no inline styles and Trusted Types. Never add a `style` attribute, an inline `<script>` or `<style>`, an event-handler attribute or an outside request; draw with SVG attributes and classes. `tests/security.test.ts` enforces this. See `SECURITY.md`.
- **Before calling UI work done:** `npm run check`, then look at both light and dark mode, a 390px-wide screen and print preview. For the landing page, also scroll the hero at 16:9, 16:10 and a phone, and once with reduced motion.

---

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs. *(Karpathy)*

- State assumptions explicitly. If uncertain, ask rather than guess.
- If multiple interpretations exist, present them — don't pick one silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

**When in doubt, flag the ambiguity and ask first. Do not guess.**

---

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative. *(Karpathy)*

- No features beyond what was asked.
- No abstractions for single-use code. Build the second case before extracting the first.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

Test: would a senior engineer call this overcomplicated? If yes, simplify.

---

## 3. Surgical Changes

Touch only what you must. Clean up only your own mess. *(Karpathy)*

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- Remove imports/variables/functions that **your** changes made unused. Leave
  pre-existing dead code unless asked.
- No backwards-compat shims, no `// removed` markers, no orphan re-exports. If
  something is genuinely unused and in scope, delete it cleanly.

Test: every changed line should trace directly to the request.

---

## 4. Goal-Driven Execution

Define success criteria, then loop until verified. *(Karpathy)*

Turn imperative tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Write a test that reproduces it, then make it pass."
- "Refactor X" → "Ensure tests pass before and after."

For multi-step tasks, state a brief plan first:

```
1. [step] → verify: [check]
2. [step] → verify: [check]
3. [step] → verify: [check]
```

Strong criteria let you run independently. "Make it work" does not.

---

## 5. Security & Secrets (HARD)

Non-negotiable in every repo.

- **Never expose API keys, tokens, secrets, or credentials** in code, comments,
  commit messages, log output, chat output, error messages surfaced to users,
  memory/doc files, or the UI. This includes example values that look real.
- Secrets live in env (`.env.local` / hosting-provider dashboard) only. A
  committed `.env.template` shows structure, never values.
- Production env vars live on the hosting dashboard, never in the repo.
- Know your framework's public-var convention (e.g. `NEXT_PUBLIC_*` is shipped
  to the browser). Anything sensitive must not carry a public prefix.
- No debug panel, route, or `console.log` that echoes env back to UI / network.
- **If you're about to print, log, or commit anything that looks like a key,
  stop and route it through env instead.**

---

## 6. Git & Branching

- Commit and push to the **default working branch** (per project — often `dev`).
  Never push to `main`/release without explicit approval.
- Feature branches off the working branch are fine; merge back to it.
- **Never commit:** build output (`dist/`, `.next/`, `.vercel/`), `node_modules/`,
  any `.env*` except `.env.template`, OS/IDE junk (`.DS_Store`, editor configs).
  Verify `.gitignore` covers these before the first commit.
- **Commit messages:** conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`,
  `refactor:`, `test:`, `style:`), optionally scoped. Subject ≤72 chars,
  imperative mood, no trailing period. Body explains the *why*, not the *what*.
- **No AI attribution.** Never add `Co-Authored-By`, "Generated with Claude
  Code," or any agent metadata to commits or PRs. No emojis in commit messages.

---

## 7. Build & Deploy Verification

- **A clean local production build is the gate before every push** — not just a
  type-check or a running dev server. CI linters and hosted builds are stricter
  than `tsc --noEmit` and have shipped broken deploys before.
- **After pushing, confirm the deploy and CI actually went green.** Never push
  and walk away. A red check or errored deploy means production is still serving
  the *previous* build, so a smoke test will show stale behavior. Treat it as a
  blocker and fix forward.
- A clean local build is necessary but not sufficient — the hosted build can
  still fail. Pull the build logs if a deploy doesn't reach a ready state.

---

## 8. Verification & Tests (HARD)

Verification is part of the work, not an afterthought. Every plan, design doc,
and handoff carries an explicit "Verification & Tests" section.

- **Write tests for new logic.** Pure functions and schemas get unit /
  round-trip tests (valid parses succeed, malformed inputs reject).
- **Use saved fixtures — never live API/network calls in tests.** Cover the
  success path *and* graceful degradation when a source fails.
- **Refactors get a regression check:** snapshot behavior before, diff after,
  prove it's unchanged.
- For high-stakes changes, run the verification (or a second-pass review) via a
  **subagent** so it's independent of the implementer.

**Definition of done (every unit of work):** tests written + passing ·
verification pass clean · build clean · pushed · deploy confirmed green · docs
updated · user checkpoint where noted.

---

## 9. Pre-Mortem for High-Stakes Changes

Before a major launch, migration, architectural change, or anything with real
blast radius, run a quick pre-mortem. *(Gary Klein, via the borghei pre-mortem skill)*

Framing: **"It's two weeks after we shipped this and it failed. Why?"** Listing
reasons a failure *already happened* surfaces more honest, specific risks than
predicting future ones. Then classify each risk:

- **Tiger** — real, evidence-backed; a plausible, concrete failure scenario.
  Ignoring it would be negligent. Assign urgency:
  - *Launch-blocking* — don't ship until mitigated (owner + decision date).
  - *Fast-follow* — fix within the first post-launch cycle.
  - *Track* — monitor; act if it escalates.
- **Paper Tiger** — sounds scary but unlikely or low-impact on inspection.
  Note it and move on; don't burn effort here.
- **Elephant** — the risk everyone senses but nobody names (usually people /
  process / org, not technical). Name it explicitly, then either assign an owner
  or consciously accept it with documented rationale.

Every launch-blocking Tiger needs: clear risk · supporting evidence · concrete
mitigation · single accountable owner · decision date.

---

## 10. Coding Conventions

- **Single source of truth for data shapes.** Define schemas once (e.g. Zod);
  infer types from them — never hand-write types that duplicate a schema.
- **No comments that restate code.** A comment earns its place only by
  explaining a non-obvious *why*: a hidden constraint, a workaround, a subtle
  invariant. Otherwise omit it.
- **Fail fast on programmer error.** Surface schema/contract violations loudly
  rather than silently returning null and retrying. Where a function can return
  "no data" *and* "operation failed," make callers able to tell them apart.
- **Financial / numeric safety:** always guard against division by zero in any
  calculation that can hit it (loss %, position sizing, ratios). Never divide by
  a value that can legitimately be zero without a floor.
- **Don't hardcode values that are configured elsewhere.** If a limit or
  parameter is injected from config/context, read it from there — hardcoded
  copies drift from the real value.

---

## 11. User-Facing Copy & Prose

### Human-friendly UI language (HARD)

Anything that renders to a screen — labels, buttons, dialog text, status pills,
banners, tooltips, error messages, empty states — must read like normal English.
Code-shaped names leak constantly because we copy schema fields straight into the
UI; this is a recurring bug, not a style preference.

**Banned in user-visible strings:**

- Acronyms only the developer knows. ❌ "HUD FMR", "RLS" → ✅ "Local rent benchmark"
- snake_case / camelCase field names. ❌ "fetch_status", "monthly_rent_low" → ✅ "Source", "Rent (low)"
- Internal status enums verbatim. ❌ "needs_review", "fetch_failed" → ✅ "Needs review", "Couldn't load"
- Task numbers, ticket IDs, TODOs. ❌ "per AD-018" → ✅ omit, or "Coming soon"
- Implementation jargon. ❌ "server action", "RSC loader" → ✅ describe what the user sees

When you must reference a concept the user doesn't know: use the friendly name in
the label, put the technical anchor in a tooltip. **Does not apply** to code
identifiers, dev-facing logs, commit messages, or internal docs — those stay technical.

### Killing AI tells in prose *(stop-slop)*

When writing prose — docs, READMEs, UI copy, PR descriptions — strip the patterns
that read as AI-generated:

- **Cut filler.** No throat-clearing openers ("Here's what..."), no emphasis
  crutches, trim adverbs.
- **Break formulaic structures.** Avoid "not X, it's Y" contrasts (state Y
  directly), negative listings, rhetorical setups, dramatic one-line fragments.
- **Active voice, human subject.** No inanimate things performing human verbs
  ("the decision emerges").
- **Be specific.** Name the actual thing, not "the implications are significant."
  Drop lazy extremes ("every", "always", "never") doing vague work.
- **Vary rhythm.** Mix sentence lengths. Don't end every paragraph on a punchy
  one-liner. No em dashes.
- **Trust the reader.** State facts directly; skip the softening and hand-holding.

---

## 12. Legal, ToS & Compliance (HARD)

Never take — or ask the user to take — an action that is illegal or violates a
third party's Terms of Service.

- Prefer official, documented, permitted methods (official APIs, sanctioned
  exports) over scraping, undocumented endpoints, or workarounds.
- Never circumvent access controls, rate limits, paywalls, CAPTCHAs, auth, or
  `robots.txt`. Respect data-use terms, licensing, and attribution.
- Respect IP and privacy — no reproducing copyrighted content beyond fair use; no
  collecting/storing personal data without a clear lawful basis.
- If a task carries legal, regulatory, ToS, or compliance risk, **stop and flag
  it plainly** — name the risk, explain why, offer a compliant alternative. Never
  proceed on "it's probably fine."
- This is caution, not legal advice. For real legal stakes, recommend a qualified
  professional.

---

## 13. Documentation & Project Memory

- Keep docs in sync with code. After a change, update the relevant decision log,
  backlog, task plan, and any session-memory file.
- **Keep a known-pitfalls log.** When a bug is non-obvious or has bitten before,
  record the symptom, root cause, and the fix/commit. Past fixes are the cheapest
  way to avoid re-introducing the same bug — read them before touching a fragile area.
- Don't relitigate settled decisions; check the decision log first.
- When work is clearly isolated (a single function, a one-off shape, a bug hunt),
  delegate to a sub-agent / lighter tool to save context.

---

## 14. What NOT to Do (quick reference)

- ❌ Print, log, or commit anything that looks like a secret — route it through env.
- ❌ Push without a clean local build, or to `main`/release without approval.
- ❌ Add Emojis to commits.
- ❌ Commit build output, `node_modules/`, or any real `.env*` file.
- ❌ Hand-write types that duplicate a schema.
- ❌ Add speculative abstractions or features for hypothetical future needs.
- ❌ Refactor or reformat code outside the scope of the request.
- ❌ Leak schema field names, enums, or jargon into user-facing copy.
- ❌ Scrape or circumvent controls when an official API exists.
- ❌ Declare work done without tests passing and a clean verification pass.
- ❌ Guess when something is ambiguous — ask.

---

*Baseline assembled from my project conventions + the Karpathy coding-guidelines
CLAUDE.md (multica-ai/forrestchang), the stop-slop prose skill (hardikpandya),
and the pre-mortem discovery skill (borghei/Claude-Skills). Trim or extend per project.*
