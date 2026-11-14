# Security

Restaurant Command Center is a static site: two HTML pages, their scripts and styles, and sample data. It has no backend, database, accounts, cookies, analytics or environment variables, and it makes no requests to other sites.

## Reporting a problem

Open a private report from the repository's Security tab ("Report a vulnerability"). If that option is missing, open an issue that says a security report is waiting, without the details, and the maintainer will arrange a private channel. Expect a first reply within a week.

## How the site is hardened

- **Escaped output.** All text from a profile passes through the `html` tag in `src/html.ts`, which escapes it. Markup reaches the page through one function, `setHtml`, which accepts only that tag's output: the compiler refuses anything else, and `setHtml` checks again when it runs.
- **Content Security Policy** (`vercel.json`). Scripts, styles, fonts and images load from the site alone. There are no inline scripts or inline styles. Trusted Types allow a single policy to write markup. The pages cannot be framed.
- **Other headers.** `X-Content-Type-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy` and a `Permissions-Policy` that turns device features off. Vercel adds HSTS.
- **Validated data.** Each profile is checked against the Zod schema in `src/schema.ts` when the site is built; a broken one stops the build and names the field. The schema refuses unknown keys, bounds the length of every text and list, and takes a website as a bare host name only. The validator is not sent to visitors.
- **Dependencies.** Exact versions with a lockfile. CI runs `npm audit`, and `.github/dependabot.yml` asks Dependabot for npm and GitHub Actions updates.
- **CI.** The workflow has read-only permissions, keeps no credentials after checkout, and pins each action to a commit. After the build it opens every view in Chrome under the same headers (`npm run smoke`) and fails on anything the policy blocks, any console error or any request to another site.
- **Dependencies of the render tool.** `hero-sequence/` only runs on the maintainer's machine to draw the landing frames. CI audits its lockfile too, on every push and once a week, and it pins a patched `undici` through an override. The render script runs only the installed, locked copy of its tool.
- **Data.** Every restaurant, competitor and figure is fictional. Tests fail if a profile is not marked as sample data, if its website does not end in `.example`, or if its city is not on a list of made-up places. CI can search for names on a private deny-list when the repository secret `REAL_NAME_DENY_LIST` is set. These are aids; keeping real data out remains a rule for people.
