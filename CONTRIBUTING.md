# Contributing Guide (Visual Tests & CI Quick Guide)


This project uses **Playwright** for E2E + **visual regression** tests. Visual snapshots are part of the source of truth and must be committed.

---

## TL;DR

- **PRs** run **Chromium only** for speed.  
- **Main** runs **Chromium + Firefox + WebKit**.  
- **Linux snapshots** in `tests/*-snapshots/*.png` are the **baselines** for CI (Ubuntu). Commit them.  
- When UI changes are intentional → **regenerate snapshots** (in Linux), review, commit.

---

## Local setup

```bash
cd seventh-horizon-ui
npm ci
npx playwright install --with-deps
npm run typecheck
npm run test:e2e
npx playwright show-report


⸻

Visual snapshot workflow

When adding/changing UI
	1.	Make your UI changes.
	2.	Update snapshots in a Linux environment (to match CI).

Option A: Docker (recommended)

cd seventh-horizon-ui
docker run --rm --network host -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.48.0-noble \
  npx playwright test --update-snapshots

Option B: CI (temporary)
Run a one-off CI job with --update-snapshots, download the artifact, review, and commit *-snapshots/.
	3.	Review the generated PNGs under tests/*-snapshots/.
	4.	Commit the baselines:

git add tests/*-snapshots/
git commit -m "test: update visual baselines"
git push

Snapshots are not build artifacts — they’re test expectations. Keep them in git.

⸻

Running tests locally

# Chromium only (fast)
npm run test:e2e -- --project=chromium

# All browsers
npm run test:e2e

# Create/update missing snapshots
npx playwright test --update-snapshots


⸻

CI details
	•	Node: 20.x
	•	Install: npm ci
	•	PRs: Chromium only
	•	Main: All browsers
	•	Artifacts: Playwright HTML report uploaded on failure

Keep CI fast & stable
	•	Disable animations (configured) and wait for stable UI before screenshots.
	•	Mask dynamic content if needed:

await expect(page).toHaveScreenshot({
  mask: [page.locator('.timestamp'), page.locator('.randomized')],
});


⸻

Common issues & fixes

“A snapshot doesn’t exist … writing actual.”
→ Generate Linux baselines (Docker or CI), commit the *-linux.png files.

“Pixels differ by X%.”
→ If change is intended, update snapshots. If not, stabilize test (waits, fixed viewport, mask dynamic bits).

Local passes, CI fails.
→ You used macOS/Windows snapshots. Regenerate in Linux.

⸻

Optional helper script

Create scripts/update-snapshots.sh:

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."/seventh-horizon-ui

echo "Updating Playwright snapshots in Docker (Linux)…"
docker run --rm --network host -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.48.0-noble \
  npx playwright test --update-snapshots

echo "✓ Snapshots updated. Review and commit:"
echo "  git add tests/*-snapshots/"
echo "  git commit -m 'test: update visual baselines'"

Make it executable:

chmod +x scripts/update-snapshots.sh


⸻

Do / Don’t

✅ Do
	•	Commit Linux snapshot PNGs in tests/*-snapshots/.
	•	Keep PRs small; prefer Chromium-only locally.
	•	Add explicit waits before screenshots.

🚫 Don’t
	•	Don’t ignore *-snapshots/ in .gitignore.
	•	Don’t generate baselines on macOS/Windows and expect CI to pass.

---
