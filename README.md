# Restaurant Command Center

A report card for a restaurant's online presence. It scores how the restaurant looks online, out of 100, and leads with the three things to do first. Behind that: ratings and reviews across platforms, the Google Business Profile, the website, social media, a nearby competitor, every recommended next step and progress over time.

Every restaurant is one JSON file. Drop a new file into `profiles/` and the dashboard renders it, scores it and adds it to the restaurant switcher.

**Live demo:** _link goes here after the first deploy_

![Overview of a sample restaurant: the score beside the three actions to do first](docs/overview.png)

> **All data in this repository is fictional.** Osteria Lumen, Brasa Taquería, their competitors, addresses and numbers are invented for the demo. The `.example` web addresses are reserved and point nowhere.

## What it shows

| Tab | What you learn |
|---|---|
| Overview | The score out of 100 and how it is built, the three actions to do first, ratings by platform, strengths and gaps |
| Google profile | Star breakdown and a profile checklist |
| Website | Phone experience, the path from visit to booking, searches worth winning, search engine basics |
| Social media | Followers, engagement, reply times, content checklist, growth ideas |
| Reviews | Volume by platform, reply habits, what diners praise and complain about |
| Competitor | Side-by-side numbers with the difference spelled out |
| Next steps | Actions grouped by timeframe and sorted into an impact and effort grid |
| Progress | The score and total reviews by month, with milestones |

![Competitor tab in dark mode](docs/competitor-dark.png)

## How the score works

The overall score is a weighted average of six parts, each from 0 to 100. Weights and targets live in [`src/scoring.config.ts`](src/scoring.config.ts).

| Part | Weight | How it is measured |
|---|---|---|
| Ratings | 25 | Average rating across platforms, weighted by review count. Most restaurants sit between 3.5 and 4.8 stars, so a 3.5 average scores 0 and 4.8 or better scores 100 |
| Review volume | 15 | Total reviews against a target of 1,500 |
| Google profile | 20 | Share of the profile checklist done (partly done counts as half) |
| Website and search | 15 | Average of the search checklist and the phone experience ratings |
| Social media | 10 | Per platform: half followers against a 5,000 target, half engagement against a 5% target. No social accounts scores 0 |
| Review replies | 15 | Share of the reply checklist done |

The current month's score is always computed from the profile. Past months come from the profile's `history` as they were recorded at the time, and the Progress tab says so. Strengths, gaps and recommendations are analyst notes written into each profile. The app ranks the recommendations and picks the three to do first: impact counts most, bigger jobs cost a point, anything due this month gets a nudge, and any action that closes a "Fix soon" gap gets a larger one. The schema refuses a "Fix soon" gap that no action due now or soon addresses. The weights live in `actionRanking` in the scoring config.

The targets suit a busy neighborhood restaurant. Change them in the config file to fit a different market.

![Next steps tab](docs/next-steps.png)

## Run it

Requires Node 22.12 or later.

```sh
npm install
npm run dev       # local server with hot reload
npm run check     # type check, tests and production build
npm run build && npm run preview   # serve the production build
```

## Add a restaurant

1. Copy `profiles/_template.json` to `profiles/<your-restaurant>.json`. Files starting with `_` are ignored by the app.
2. Fill it in. `slug` becomes the address: `/?r=<slug>`. Keep `sampleData` set to `true` for invented data; the page then says so in the header and footer.
3. Run `npm run check`. If something is off (a rating above 5, star counts that don't add up to the Google review total, history months out of order), the tests name the field and the problem.

The tests require `sampleData: true` on every committed profile. That guard keeps real restaurant data out of this public repo. To use real data, keep it in a private fork and drop that one test.

The schema in [`src/schema.ts`](src/schema.ts) is the single definition of a profile. TypeScript types come from it, so the code and the data can't drift apart.

## Features

- **Pick a restaurant** from the top bar. The restaurant and tab live in the address (`/?r=osteria-lumen&tab=competitor`), so any view can be shared as a link.
- **Light and dark mode**, following the system setting until you choose. Both modes are designed, not inverted.
- **Print or save as PDF** turns the whole report, every section in order, into a light-paper document an owner can keep.
- **Works on a phone.** Wide tables restack into labelled rows, and bars give way to the numbers.
- **Honest numbers.** Bars start at zero, each chart has one axis, a missing platform is named as a gap instead of drawn as zero, and estimates show as High, Medium or Low instead of made-up scores.
- **Accessible.** Keyboard tabs (arrow keys, Home, End), visible focus, status shown in words as well as colour, charts backed by data tables for screen readers. The test suite runs axe-core on every tab; colour contrast was checked in Chrome in both modes.

## How it is built

- **Vite + TypeScript**, no framework. Each tab is a small function in `src/render/` that turns a profile into HTML.
- **Zod** validates every profile when the app loads and in the tests.
- **Charts are hand-written SVG** (`src/render/line-chart.ts`): one series, one axis, a caption when the axis doesn't start at zero. No chart library.
- **Tests** cover the schema, scoring, every tab's rendering, keyboard tabs and address state in a simulated browser, and axe-core accessibility checks.
- **Fonts are self-hosted** from npm (Fraunces and Onest), so the page makes no outside requests.
- Profile text is escaped before it reaches the page, so a profile can't inject markup.
- No backend, no tracking, no API keys.

## Design

The look is documented in [`DESIGN.md`](DESIGN.md): warm paper, ink rules, one ink-blue accent kept apart from status colours, tables before cards, and one signature object, the "Do these first" ticket. It follows the craft rules of [Hallmark](https://github.com/Nutlope/hallmark) for app screens: every colour and font through a token, no gradients or uppercase labels, one y-axis per chart, bars that start at zero, and status that never relies on colour alone.

## Decisions and trade-offs

- **Static and offline-first.** No backend means no accounts to secure and nothing to break on a free host. The cost: profiles are files, so updating a restaurant means a commit.
- **One score, shown with its parts.** A single number is easy to act on and easy to distrust, so the overview always shows the weights and each part's score beside it.
- **Lead with actions.** Owners don't need another chart; they need to know what to do this week. The ticket of three actions sits next to the score.
- **Hand-written SVG over a chart library.** Two small chart types cost under 150 lines and cut the JavaScript bundle from about 300 KB to about 135 KB.
- **Fictional data only.** The project began as a dashboard for a real restaurant. Without the owner's written permission, nothing from it is public; a test refuses any committed profile not marked as sample data.

## Where data could come from

This demo uses hand-written profiles. A production version would fill them from official sources only: the Google Business Profile API for the owner's own listing, Yelp Fusion and the Tripadvisor Content API within their display and caching rules, and the owner's own exports from Instagram, TikTok and Facebook. Each of those has terms on storing and showing data, so read them before you automate anything.

## License

Code: [MIT](LICENSE). The sample restaurants are fictional and free to reuse.
