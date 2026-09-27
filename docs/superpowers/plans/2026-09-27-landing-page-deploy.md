# Marketing Landing Page at the Site Root Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the PrepLocker marketing page the front door at `https://rvpdev.github.io/practice-test-app/`, with the Expo app moved to `/app/` and both combined by the GitHub Pages deploy workflow.

**Architecture:** A new static `web/landing.html` (plain HTML/CSS, no build step) becomes the site root's `index.html`. The existing Expo static export moves under an `app/` subdirectory by changing `app.json`'s `baseUrl`. The GitHub Actions deploy workflow assembles both into one output directory before uploading it as the Pages artifact — no change to the Expo app's code.

**Tech Stack:** Plain HTML/CSS (Sora + Inter via Google Fonts), GitHub Actions, Expo static web export.

**Spec:** `docs/superpowers/specs/2026-09-27-landing-page-deploy-design.md`

## Global Constraints

- The Expo app's own code, screens, and behavior do not change — the only app-side change is `app.json`'s `experiments.baseUrl`, from `/practice-test-app` to `/practice-test-app/app`.
- `web/landing.html` is a complete, standalone `<!doctype html>` document (not an Artifact-tool fragment) — it must work as a plain file on GitHub Pages with no wrapper the page doesn't provide itself.
- Both CTA buttons and the nav's "Open the app" link in the landing page point at the relative path `./app/`, not an absolute URL.
- The deploy workflow's assembled output directory (`site/`) must contain: `index.html` (the landing page) at the root, the full Expo export under `app/`, `app/404.html` (a copy of `app/index.html`, for the app's existing deep-link SPA-fallback behavior), and a root-level `404.html` (also a copy of `app/index.html` — GitHub Pages serves one 404 page for the whole project, and the app's dynamic routes are what actually need SPA fallback).
- Nothing in this plan gets pushed to `main` until the final verification task passes locally — a push to `main` is an immediate live redeploy.

## Review Focus

- A visitor loading `/app/` directly (not via the landing page) must get a working app, not a blank page or 404 — this is the `baseUrl` change's core risk, since every asset URL the Expo export emits is baked in at build time. → Task 4.
- A stale bookmark or shared link to the *old* root-level app URL (pre-this-change) will now hit the landing page instead of the app — expected and acceptable per the approved design, but worth confirming the landing page itself doesn't error or look broken when landed on cold, with no referrer. → Task 4.
- The landing page's Google Fonts (`fonts.googleapis.com`) must actually load over a real network request when served as a plain static file — nothing here depends on the Artifact tool's CSP, but a typo in the `<link>` tag transcription would silently fall back to a system font with no visible error. → Task 1.
- A user hitting a genuinely nonexistent path anywhere under the site (typo'd URL, old deep link to a route since removed) must still land somewhere functional (the app shell), not a blank GitHub 404 page. → Task 3, verified in Task 4.
- The assembled `site/` directory's fallback files (`404.html`, `app/404.html`) must be byte-identical copies of `app/index.html`, not stale or divergent copies from a re-run of the workflow — a `cp` step that runs before the file it's copying is fully written would silently produce a broken fallback. → Task 4.

---

### Task 1: `web/landing.html`

**Files:**
- Create: `web/landing.html`

**Interfaces:**
- Produces: a complete, standalone HTML document at `web/landing.html`. No exports, no build step — Task 3 copies this file byte-for-byte into the deploy output.

- [ ] **Step 1: Create the file**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PrepLocker</title>
<meta name="description" content="Marketing landing page for PrepLocker, a privacy-first CompTIA exam practice app.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --text:#12161c;
    --text-muted:#5d6472;
    --bg:#f6f7f9;
    --surface:#ffffff;
    --border:#d9dde4;
    --navy:#1e3a5f;
    --navy-text:#ffffff;
    --amber:#b45309;
    --amber-tint:#f7e6cc;
    --good:#1c7a4a;
    --good-tint:#e4f4ea;
    --shadow-card:0 1px 2px rgba(0,0,0,0.06);
    color-scheme:light;
  }
  @media (prefers-color-scheme: dark){
    :root:not([data-theme="light"]){
      --text:#f2f4f7;
      --text-muted:#a2abb8;
      --bg:#0f1216;
      --surface:#181c22;
      --border:#2d333c;
      --navy:#3a5d8a;
      --navy-text:#ffffff;
      --amber:#f0a839;
      --amber-tint:#3a2a14;
      --good:#5fd39b;
      --good-tint:#123526;
      --shadow-card:0 1px 3px rgba(0,0,0,0.4);
      color-scheme:dark;
    }
  }
  :root[data-theme="dark"]{
    --text:#f2f4f7;
    --text-muted:#a2abb8;
    --bg:#0f1216;
    --surface:#181c22;
    --border:#2d333c;
    --navy:#3a5d8a;
    --navy-text:#ffffff;
    --amber:#f0a839;
    --amber-tint:#3a2a14;
    --good:#5fd39b;
    --good-tint:#123526;
    --shadow-card:0 1px 3px rgba(0,0,0,0.4);
    color-scheme:dark;
  }

  *{box-sizing:border-box;}
  body{
    margin:0;
    background:var(--bg);
    color:var(--text);
    font-family:"Inter", ui-sans-serif, system-ui, sans-serif;
    line-height:1.55;
    padding-inline:20px;
  }
  .wrap{max-width:1040px;margin-inline:auto;}
  a{color:inherit;}
  h1,h2,h3{font-family:"Sora", ui-sans-serif, system-ui, sans-serif;font-weight:700;text-wrap:balance;margin:0;}
  h2,h3{font-weight:600;}
  .data{font-family:"Inter", ui-monospace, monospace;font-weight:600;font-variant-numeric:tabular-nums;}

  .badges{display:flex;gap:8px;flex-wrap:wrap;}
  .badge{
    font-size:13px;font-weight:600;color:var(--amber);background:var(--amber-tint);
    padding:5px 11px;border-radius:8px;
  }

  nav.wrap{
    display:flex;align-items:center;justify-content:space-between;
    padding-block:22px;
  }
  .brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:17px;font-family:"Sora";}
  .brand svg{flex:none;color:var(--navy);}
  nav .navlink{
    font-size:14px;color:var(--text-muted);text-decoration:none;
    border:1px solid var(--border);padding:8px 16px;border-radius:8px;
  }

  .hero{
    display:grid;grid-template-columns:1.1fr 1fr;gap:56px;
    padding-block:24px 64px;align-items:center;
  }
  .hero h1{font-size:clamp(32px,4.4vw,50px);line-height:1.1;margin-top:18px;}
  .hero p.lede{
    font-size:17px;color:var(--text-muted);max-width:46ch;margin-top:18px;
  }
  .cta-row{display:flex;gap:14px;align-items:center;margin-top:28px;flex-wrap:wrap;}
  .btn{
    font-family:"Inter";font-weight:600;font-size:15px;
    padding:13px 22px;border-radius:8px;text-decoration:none;
    display:inline-flex;align-items:center;gap:8px;border:1px solid transparent;
  }
  .btn-primary{background:var(--navy);color:var(--navy-text);}
  .btn-ghost{border-color:var(--border);color:var(--text);}
  .fineprint{font-size:13px;color:var(--text-muted);margin-top:12px;}

  .examcard{
    background:var(--surface);border:1px solid var(--border);
    border-radius:12px;padding:22px;position:relative;
    box-shadow:var(--shadow-card);
  }
  .examcard .code{font-size:12px;color:var(--text-muted);letter-spacing:.02em;}
  .examcard .q{font-size:15px;margin-top:10px;font-weight:500;}
  .opt{
    display:flex;align-items:center;gap:10px;
    border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-top:9px;font-size:14px;
  }
  .opt .box{width:15px;height:15px;border:1.5px solid var(--text-muted);border-radius:4px;flex:none;}
  .opt.correct{border-color:var(--good);background:var(--good-tint);}
  .opt.correct .box{border-color:var(--good);background:var(--good);}
  .scorewrap{
    display:flex;align-items:center;gap:14px;margin-top:20px;padding-top:18px;border-top:1px solid var(--border);
  }
  .ring{width:52px;height:52px;flex:none;}
  .scorewrap .num{font-size:20px;}
  .scorewrap .lbl{font-size:12.5px;color:var(--text-muted);}
  .examcard .lockbadge{
    position:absolute;top:-11px;right:18px;background:var(--amber-tint);color:var(--amber);
    font-size:11px;font-weight:600;padding:5px 10px;border-radius:8px;
    display:flex;align-items:center;gap:6px;
  }

  section{padding-block:56px;border-top:1px solid var(--border);}
  section h2{font-size:clamp(24px,3vw,32px);max-width:28ch;}
  section p.section-lede{color:var(--text-muted);max-width:60ch;margin-top:14px;font-size:15.5px;}

  .pillars{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--border);border:1px solid var(--border);margin-top:32px;border-radius:12px;overflow:hidden;}
  .pillar{background:var(--surface);padding:26px 22px;}
  .pillar h3{font-size:17px;}
  .pillar p{font-size:14px;color:var(--text-muted);margin-top:8px;}

  .pricelist{margin-top:30px;border-top:1px solid var(--border);}
  .price-row{
    display:flex;align-items:baseline;justify-content:space-between;
    padding:18px 0;border-bottom:1px solid var(--border);gap:20px;
  }
  .price-row .name{font-size:16px;font-weight:500;}
  .price-row .tag{font-size:12px;color:var(--text-muted);display:block;margin-top:3px;}
  .price-row .amount{font-size:18px;font-weight:600;white-space:nowrap;}
  .price-row .amount.free{color:var(--good);}
  .price-note{margin-top:18px;font-size:14px;color:var(--text-muted);}

  details{border-bottom:1px solid var(--border);padding-block:16px;}
  details summary{
    cursor:pointer;font-weight:500;font-size:15.5px;list-style:none;
    display:flex;justify-content:space-between;align-items:center;gap:12px;
  }
  details summary::-webkit-details-marker{display:none;}
  details summary::after{content:"+";color:var(--text-muted);font-size:18px;flex:none;font-weight:400;}
  details[open] summary::after{content:"\2013";}
  details p{margin:12px 0 2px;font-size:14.5px;color:var(--text-muted);max-width:64ch;}

  .closing{
    text-align:center;padding-block:64px;
  }
  .closing h2{margin-inline:auto;}
  .closing .cta-row{justify-content:center;}

  footer.wrap{
    border-top:1px solid var(--border);padding-block:26px;
    font-size:13px;color:var(--text-muted);
  }

  @media (prefers-reduced-motion: reduce){
    * { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; }
  }

  @media (max-width:760px){
    .hero{grid-template-columns:1fr;padding-block:12px 40px;}
    .pillars{grid-template-columns:1fr;}
    nav .navlink{display:none;}
  }
</style>
</head>
<body>

<nav class="wrap">
  <div class="brand">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/>
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="12" cy="16" r="1.4" fill="currentColor"/>
    </svg>
    PrepLocker
  </div>
  <a class="navlink" href="./app/">Open the app ↗</a>
</nav>

<div class="wrap hero">
  <div>
    <div class="badges">
      <span class="badge">CompTIA A+</span>
      <span class="badge">Security+</span>
      <span class="badge">Network+</span>
    </div>
    <h1>The CompTIA practice exam that never leaves your device.</h1>
    <p class="lede">Timed mock exams and untimed practice for A+, Security+, and Network+. Pay once per exam — no subscription, no renewal, ever.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="./app/">Try Core 1 free</a>
      <a class="btn btn-ghost" href="#pricing">See pricing</a>
    </div>
    <p class="fineprint">Full 86-question A+ Core 1 exam, free. No account needed to start.</p>
  </div>
  <div class="examcard">
    <div class="lockbadge">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2.2"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11" stroke="currentColor" stroke-width="2.2"/></svg>
      on-device
    </div>
    <span class="code data">220-1201 · Mock Exam · Q14 of 86</span>
    <p class="q">Which RAID level provides disk mirroring for fault tolerance?</p>
    <div class="opt"><span class="box"></span> RAID 0</div>
    <div class="opt correct"><span class="box"></span> RAID 1</div>
    <div class="opt"><span class="box"></span> RAID 5</div>
    <div class="scorewrap">
      <svg class="ring" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--border)" stroke-width="3"/>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--good)" stroke-width="3"
          stroke-dasharray="97.4" stroke-dashoffset="21" stroke-linecap="round" transform="rotate(-90 18 18)"/>
      </svg>
      <div>
        <div class="num data">78%</div>
        <div class="lbl">current attempt · passing at 72%</div>
      </div>
    </div>
  </div>
</div>

<section class="wrap" id="privacy">
  <h2>Nothing about your studying leaves your device.</h2>
  <p class="section-lede">Every other practice app in this category asks for an account before you can answer one question. PrepLocker doesn't have anywhere to send your data, because it doesn't have a server.</p>
  <div class="pillars">
    <div class="pillar">
      <h3>On-device, always</h3>
      <p>Your question sets, attempt history, and scores live only on your phone or in your browser. Nothing is uploaded, nothing is tracked.</p>
    </div>
    <div class="pillar">
      <h3>Build your own sets</h3>
      <p>Import or export question sets as JSON, or build one from scratch in the app — for any exam or quiz, not just CompTIA.</p>
    </div>
    <div class="pillar">
      <h3>Pay once per exam</h3>
      <p>No monthly fee, no renewal, no expiration. Unlock an exam and it's yours for as long as you need it.</p>
    </div>
  </div>
</section>

<section class="wrap" id="pricing">
  <h2>One price. No subscription. No expiration.</h2>
  <div class="pricelist">
    <div class="price-row">
      <div>
        <span class="name">CompTIA A+ Core 1</span>
        <span class="tag data">220-1201 · 86 questions</span>
      </div>
      <span class="amount free data">Free</span>
    </div>
    <div class="price-row">
      <div>
        <span class="name">CompTIA A+ Core 2</span>
        <span class="tag data">220-1202</span>
      </div>
      <span class="amount data">$6.99</span>
    </div>
    <div class="price-row">
      <div>
        <span class="name">CompTIA Security+</span>
        <span class="tag data">SY0-701</span>
      </div>
      <span class="amount data">$7.99</span>
    </div>
    <div class="price-row">
      <div>
        <span class="name">Security+ Vol. 2</span>
        <span class="tag data">90 questions</span>
      </div>
      <span class="amount data">$12.99</span>
    </div>
  </div>
  <p class="price-note">Unlock once, keep it forever. No account required to purchase or to use what you've unlocked.</p>
</section>

<section class="wrap" id="faq">
  <h2>Before you install</h2>
  <div style="margin-top:28px;">
    <details open>
      <summary>Is this affiliated with CompTIA?</summary>
      <p>No. PrepLocker is an independently built practice app, not affiliated with or endorsed by CompTIA.</p>
    </details>
    <details>
      <summary>Do I need an account?</summary>
      <p>No. There's nothing to sign up for and nothing to log into — open the app and start practicing.</p>
    </details>
    <details>
      <summary>What happens to my data?</summary>
      <p>It stays on your device. There's no server storing it, so it can't be seen, shared, or exposed in a breach.</p>
    </details>
    <details>
      <summary>Can I use this for exams other than CompTIA?</summary>
      <p>Yes — build your own question sets in the app, or import and export sets as JSON, for any exam or quiz you want to study.</p>
    </details>
    <details>
      <summary>Is Core 1 really free, no catch?</summary>
      <p>Yes — the full 86-question Core 1 exam is free. You only pay if you choose to unlock additional exams.</p>
    </details>
    <details>
      <summary>What platforms does this work on?</summary>
      <p>Web, iOS, and Android, from one app.</p>
    </details>
  </div>
</section>

<section class="wrap closing" style="border-top:none;">
  <h2>Start with the free Core 1 exam.</h2>
  <div class="cta-row">
    <a class="btn btn-primary" href="./app/">Try Core 1 free</a>
  </div>
</section>

<footer class="wrap">
  PrepLocker — not affiliated with or endorsed by CompTIA.
</footer>

</body>
</html>
```

- [ ] **Step 2: Standalone visual check**

Run (per `[[practice_test_workspace_layout]]`): drive the raw file with `puppeteer-core` against `/usr/bin/google-chrome-stable` from the session scratchpad — `page.goto('file:///…/web/landing.html')`, capture console messages and a full-page screenshot.

Expected: no console errors, no failed requests (the two `fonts.googleapis.com`/`fonts.gstatic.com` requests succeed), and the screenshot shows the page rendered in Sora/Inter with the navy/amber palette — not a fallback system font, not unstyled HTML.

- [ ] **Step 3: Commit**

```bash
git add web/landing.html
git commit -m "Add the marketing landing page as a standalone static file"
```

---

### Task 2: `app.json` — move the app to `/app`

**Files:**
- Modify: `app.json`

**Interfaces:**
- Produces: every asset URL the next `npx expo export -p web` emits is now prefixed `/practice-test-app/app` instead of `/practice-test-app`.

- [ ] **Step 1: Change the one line**

```json
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true,
      "baseUrl": "/practice-test-app/app"
    }
```

(This replaces the existing `"baseUrl": "/practice-test-app"` — nothing else in `app.json` changes.)

- [ ] **Step 2: Confirm the app still exports without error**

Run: `npx expo export -p web`
Expected: exits 0, `dist/` is produced. (Full correctness of the new paths is verified end-to-end in Task 4 — this step only confirms the config change itself doesn't break the export.)

- [ ] **Step 3: Commit**

```bash
git add app.json
git commit -m "app.json: move the web app to the /app base path"
```

---

### Task 3: Deploy workflow — assemble landing page + app

**Files:**
- Modify: `.github/workflows/deploy-pages.yml`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `web/landing.html` (Task 1), the Expo export produced under the new `baseUrl` (Task 2).
- Produces: a `site/` directory with `index.html` (landing), `app/` (the full Expo export), `app/404.html`, and `404.html` — this is what gets uploaded as the Pages artifact.

- [ ] **Step 1: Replace the build job's steps after the export**

The current file's `build` job has these steps after `npm ci`:

```yaml
      - run: npx expo export -p web
      # web.output: "static" only emits HTML for routes known at build time, so a
      # hard refresh or direct link to a runtime-only route (a user-created set,
      # a session/results attempt id) has no matching file on a plain static
      # host. Falling back to the app shell on 404 lets the client-side router
      # take over and render the right screen from the real URL.
      - run: cp dist/index.html dist/404.html
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
```

Replace them with:

```yaml
      - run: npx expo export -p web
      # The landing page lives at the site root; the app moves under /app
      # (app.json's baseUrl). web.output: "static" only emits HTML for
      # routes known at build time, so a hard refresh or direct link to a
      # runtime-only route (a user-created set, a session/results attempt
      # id) has no matching file — falling back to the app shell on 404
      # lets the client-side router take over and render the right screen.
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

- [ ] **Step 2: Add the new build-output directory to `.gitignore`**

`.gitignore` already has a `dist/` entry (the existing Expo export output) but not `site/` (this task's new assembled-output directory). Add a `site/` line next to the existing `dist/` entry, so Task 4's local verification doesn't leave an untracked directory for `git status` to flag.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-pages.yml .gitignore
git commit -m "Deploy workflow: assemble the landing page and the app into one site"
```

(This workflow file only runs on a push to `main` — committing it to this feature branch has no live effect until the branch is merged. Task 4 verifies the same assembly logic locally before that happens.)

---

### Task 4: Local build-and-serve verification

**Files:** none (verification only — no code changes expected).

This is the gate the spec requires before this branch is ever merged to `main`, since a push there is an immediate live redeploy.

- [ ] **Step 1: Build and assemble exactly what the workflow will produce**

Run, from the repo root:
```bash
npx expo export -p web
mkdir -p site
cp -r dist site/app
cp site/app/index.html site/app/404.html
cp web/landing.html site/index.html
cp site/app/index.html site/404.html
```

- [ ] **Step 2: Verify the fallback files are correct copies**

Run:
```bash
diff site/404.html site/app/index.html
diff site/app/404.html site/app/index.html
```
Expected: both `diff` commands produce no output (exit 0) — the fallback files are byte-identical to the app shell, not stale or partially-written copies.

- [ ] **Step 3: Serve the assembled site locally**

Run: `python3 -m http.server 8080 --directory site` (background this process; the next steps drive it with a browser while it runs).

- [ ] **Step 4: Browser verification with puppeteer-core**

Per `[[practice_test_workspace_layout]]`: drive `http://localhost:8080/` with `puppeteer-core` against `/usr/bin/google-chrome-stable`, capturing console messages, failed requests, and screenshots. Check, in order:

1. `http://localhost:8080/` — the landing page renders (title "PrepLocker", navy/amber visible in the screenshot), zero console errors, zero failed requests.
2. Click (or navigate directly to) `http://localhost:8080/app/` — the Expo app's Welcome/consent screen renders, zero console errors, zero failed requests (this is the critical check: it confirms every asset URL the `baseUrl` change produced actually resolves under `/app/`).
3. `http://localhost:8080/app/results/does-not-exist` (a route with no matching static file) — confirms the local server would 404 here (expected, since Python's built-in server doesn't emulate GitHub Pages' custom-404 behavior); this is a known limitation of local verification, not a real gap — Step 2's `diff` checks already prove the actual fallback file GitHub Pages will serve is correct.

Expected: checks 1 and 2 both pass clean. If either shows a console error or a failed request, stop — do not proceed to committing/finishing this branch until the root cause (most likely a `baseUrl` mismatch) is fixed and re-verified.

- [ ] **Step 5: Stop the local server and clean up**

Run (as its own separate command, not combined with anything else — per `[[practice_test_app_mock_mode_render_loop_bug]]`'s established gotcha about killing a server in the same command as other work): stop the `python3 -m http.server` background process, then `rm -rf site dist` (both are build output, not meant to be committed — confirm neither is tracked by git before removing).

- [ ] **Step 6: Report findings**

If both checks passed clean, note it in the memory update for this feature — this is the evidence that clears the branch to merge. If anything failed, fix the root cause in the relevant task's files (most likely Task 2's `baseUrl` or Task 3's assembly script) and re-run this task's verification from Step 1 before treating this plan as done.
