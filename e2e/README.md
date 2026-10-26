# End-to-end tests

Playwright tests that drive a real browser against the real client and API
— as opposed to `server/test/api.test.js`, which tests the API directly
without a browser, or `server/src/utils/*.test.js`, which test pure logic
in isolation. This is the layer that catches "the API is correct but the
button is wired to the wrong handler" class of bug.

## Running locally

You need a real MongoDB reachable, same as running the app normally (a
throwaway database is fine — tests create and clean up their own users).

```bash
cd e2e
npm install
npx playwright install chromium   # one-time, downloads a browser build

E2E_MONGO_URI="<your MongoDB connection string>" npm test
```

That's it — Playwright automatically starts both the API (`server/`) and
the client (`client/`) for you before running tests, and shuts them down
afterward. You don't need to run `npm run dev` in either folder yourself
first.

Useful variants:

```bash
npm run test:headed   # watch the browser while tests run
npm run test:ui       # Playwright's interactive UI mode — good for debugging
npm run report        # view the HTML report from the last run
```

## What's covered

- Landing page entry points, 404 handling
- The full stepped quiz → results flow, including that the diagram actually
  branches (not a hardcoded chain) and the Well-Architected review renders
- The free-text description mode, including the no-API-key failure path
- Auth: register, login, wrong password, duplicate email, profile name and
  password changes (verified by actually logging in with the new password
  afterward, not just checking the API response)
- Service catalog search/filter, compare page (default, featured pairs, an
  uncommon pair with no curated verdict)
- History: save, view, delete, and that one user never sees another user's
  saved recommendations
- Shareable links: a fresh, unauthenticated browser context can view a
  shared recommendation; a bad share ID shows a clear error
- Theme toggle persistence, chat widget focus management and Escape-to-close,
  cost estimator slider reactivity, PDF export actually downloading a file
- JSON export: the downloaded file is actually read and parsed, checking
  real content (title, diagram nodes, all 6 WAF pillars) rather than just
  the filename, and confirming Mongo-internal fields never leak into it
- "Duplicate & tweak": the quiz actually pre-fills with a saved stack's
  original answers (checked as a real selected state, not just passed
  data), and changing one answer produces a genuinely different,
  correctly-scored recommendation
- Terraform generation: the download gate actually blocks until
  acknowledged, complex services are genuinely declined rather than
  silently dropped, and a real downloaded main.tf is read back and
  checked for the actual security defaults (no hardcoded secrets, the
  right IAM policy attached) — not just that a file appeared
- Two regression tests for a real bug found during a dedicated bug hunt:
  React Router doesn't remount a component on a same-path navigation by
  default, but QuizPage and CostEstimatorPage both froze
  `location.state`-derived data into a `useState` initializer that only
  ran once. Clicking the navbar's "quiz" or "cost" link while already on
  that page silently kept showing stale state — a completed tweak
  banner and stuck stepper progress in the worse case, a missing preset
  highlight in the milder one. Fixed by keying both routes on
  `location.key` in `App.jsx`.
- A deterministic regression test for a genuine race condition found in
  a second bug hunt: switching between comparison pairs quickly could
  resolve out of order, letting a slower first response overwrite a
  faster second one and silently show the wrong comparison. The test
  doesn't hope for a lucky timing window — it uses Playwright route
  interception to force the first request to resolve after the second
  one, deterministically, and was confirmed to actually fail against the
  unfixed code before being checked in. The same fix (an ignore-flag on
  cleanup) was applied to SharedResultPage and LandingPage's data-fetching
  effects too, for the same underlying reason.
- Two regression tests from a third bug hunt for a genuinely disruptive
  bug: QuizPage's and DescribeForm's submission handlers each run a
  multi-second chain of awaited sleeps before a final navigate('/results')
  call. Clicking away to a different page (QuizPage) or just switching the
  "Answer questions" tab (DescribeForm) part way through — both completely
  ordinary things to do — unmounted the component, but the async function
  kept running regardless and would still fire navigate() once it
  finished, yanking the user back to results a couple seconds after they'd
  deliberately gone somewhere else. Worth noting honestly: the first
  attempt at fixing this had its own bug — a mounted-ref guard that only
  ever got set to `false` in the effect's cleanup, with nothing to set it
  back to `true`. React 18 StrictMode double-invokes effects in
  development specifically to catch this class of mistake (mount →
  cleanup → mount again), which left the ref permanently stuck at `false`
  from the very first render and silently broke the quiz's question
  auto-advance entirely. Caught immediately because the regression test
  was run against the "fixed" code before being trusted, exactly like the
  unfixed code was tested first — both failed, for different reasons,
  until the guard was corrected to set itself back to `true` inside the
  effect body rather than relying on the initial ref value alone.
- The dashboard: correct aggregated stats (saved count, workload breakdown,
  average Well-Architected score) computed from real saved recommendations,
  not just that the page renders
- Comparing two saved history items: real pillar-winner detection and
  service diff computed from genuinely different saved stacks, plus the
  2-item selection cap and stale-selection cleanup after a delete
- The "how it works" page: the self-diagram actually renders as a real
  branching graph, and its screen-reader text alternative describes it
  correctly without any page-specific accessibility code

## What's deliberately skipped

One test (`describe-mode.spec.js`) exercises a real Gemini API call and only
runs when `E2E_HAS_GEMINI_KEY=1` is set for the test run, with a real
`GEMINI_API_KEY` also configured on the API server — otherwise every test
run would either need a real key (cost, flakiness from a live external
dependency) or silently pass regardless. The no-key failure path is tested
unconditionally instead, since that's the deterministic part.

## CI

Runs in GitHub Actions against a real MongoDB service container — see
`.github/workflows/ci.yml`. Playwright downloads its own browser build
there (`npx playwright install --with-deps chromium`), which needs the
normal internet access CI runners have.

- Session expiry, both directions: a token that goes invalid mid-session
  signs you out and redirects to login with a toast, while a wrong current
  password (also a 401, on an authenticated request) shows an inline error and
  keeps you signed in. The first test originally had a race of its own — the
  landing page fires its own request right after sign-in, which could hit the
  corrupted token first and shift the navbar under the click — fixed by waiting
  for that request to settle before invalidating the token.
