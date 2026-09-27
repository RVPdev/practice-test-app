# Marketing Landing Page at the Site Root — Design Spec

## 1. Purpose

`https://rvpdev.github.io/practice-test-app/` currently serves the Expo app directly — its Welcome/consent screen is the first thing a visitor sees. The user wants the PrepLocker marketing landing page (already designed as a Claude Artifact, matching the app's Phase 2 navy+amber/Sora+Inter system) to be the front door at that URL instead, with the app itself reachable one click away.

## 2. Scope

### In scope
- A new static `web/landing.html` file in the repo, adapted from the existing PrepLocker Artifact into a standalone HTML document.
- `app.json`'s `experiments.baseUrl` changes from `/practice-test-app` to `/practice-test-app/app`, so the Expo app's static export resolves correctly once it moves off the site root.
- `.github/workflows/deploy-pages.yml` assembles a combined deploy directory: the landing page at the root, the Expo app's export under `app/`.
- The landing page's CTA links point at `./app/` instead of the bare root URL.
- Local build-and-serve verification (puppeteer-core, matching this repo's existing browser-testing convention) before anything reaches `main` — a push to `main` is an immediate live deploy.

### Out of scope
- Any change to the Expo app's own code, screens, or behavior beyond the one-line `baseUrl` config change.
- A custom domain (still served under the `github.io/practice-test-app` path).
- Analytics, A/B testing, or any dynamic behavior on the landing page — it stays a plain static HTML/CSS document, same as the Artifact version.

## 3. Repo structure

`web/landing.html` — the marketing page, adapted from the current PrepLocker Artifact:
- Remove the Artifact-tool skeleton assumptions: author it as a complete, self-contained `<!doctype html><html>...</html>` document (the Artifact version omits these because the Artifact service injects them; a plain GitHub Pages file needs them written out).
- Keep the content, palette, typography, and structural choices exactly as designed (navy `#1e3a5f`/`#3a5d8a`, amber `#b45309`/`#f0a839`, Sora + Inter, the removed AI-slop chrome, the single-shadow hero card).
- Change both CTA hrefs and the nav's "Open the app" link from `https://rvpdev.github.io/practice-test-app/` to the relative path `./app/`.

`app.json` — one line changes:
```json
"experiments": {
  "typedRoutes": true,
  "reactCompiler": true,
  "baseUrl": "/practice-test-app/app"
}
```

## 4. Deploy pipeline (`.github/workflows/deploy-pages.yml`)

Replace the current `build` job's steps after `npx expo export -p web` with an assembly step that combines the app export and the landing page into one directory, then upload that directory instead of `dist` directly:

```yaml
      - run: npx expo export -p web
      - name: Assemble site (landing page at root, app under /app)
        run: |
          mkdir -p site
          cp -r dist site/app
          cp site/app/index.html site/app/404.html
          cp web/landing.html site/index.html
          cp site/app/index.html site/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
```

- `site/app/404.html`: the existing SPA deep-link fallback trick (a hard refresh or direct link to a runtime-only route has no matching static file, so falling back to the app shell lets the client-side router take over), now scoped correctly to the `/app/` subtree.
- `site/404.html`: GitHub Pages serves one 404 page for the whole project site regardless of which subpath was hit. It falls back to the app shell (not the landing page) because the app's dynamic routes (a user-created set, a session/results attempt id) are the ones that genuinely need SPA-style fallback; a mistyped marketing URL falling back to the app shell is a minor, acceptable UX nit by comparison.

## 5. Verification before this reaches `main`

A push to `main` triggers an immediate live redeploy (`deploy-pages.yml`), so this gets verified locally first, following this repo's established browser-testing convention (puppeteer-core against `/usr/bin/google-chrome-stable`, script kept in the session scratchpad):

1. Build locally with the new `baseUrl`: `npx expo export -p web`.
2. Assemble `site/` locally using the same three copy commands the workflow will run.
3. Serve `site/` locally (e.g. `npx serve site` or `python3 -m http.server` from that directory) and check with a real browser:
   - `/` renders the landing page with no console errors and no failed asset requests.
   - `/app/` renders the Welcome/consent screen with no console errors and no failed asset requests (confirming the `baseUrl` change didn't break asset resolution).
   - A representative deep app route (e.g. a `session/`, `results/`, or `set/` URL that has no matching static file) still falls back to the app shell correctly.
4. Only after all three checks pass does the change get committed and pushed.

## 6. Risks / open questions

- `baseUrl` is baked into every asset URL the Expo static export emits. If step 5.3's local verification is skipped or done carelessly, a broken `baseUrl` would only surface once it's already live. This is why the plan makes local verification its own explicit, non-skippable task.
- The landing page currently links to Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) — this works identically as a plain static file (no Artifact-specific CSP applies once it's just a file on GitHub Pages), but is worth a quick visual sanity check during verification that the fonts actually load over a real network request rather than silently falling back to a system font.
- No existing automated test suite covers `web/landing.html` or the deploy workflow itself (this repo's Jest suite tests the Expo app's React components, not static HTML or CI YAML) — verification here is manual/browser-based by necessity, same as this repo's precedent for other deploy-adjacent changes.
