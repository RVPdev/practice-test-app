# Visual Redesign (Phase 2) — Design Spec

## 1. Purpose

Phase 1 (merged, live — PR #1) added a manual Light/Dark/System theme-mode toggle but kept the existing visual language unchanged: a single generic blue accent, system font, no elevation/shadows, and flat bordered cards. Phase 2 is the visual pass this was always meant to set up for: a distinctive accent palette, a real type scale with a custom font, elevation, and a fix for a genuine "everything's a card" anti-pattern found in the list screens. The personality goal (locked 2026-09-17): "Clean & focused" — minimal, confident, professional, restrained color for correctness/progress states. Nothing here changes app behavior or data; it is a look-and-feel pass.

## 2. Scope

### In scope (Phase 2)
- New accent palette: **Navy + Amber** (two-tone), chosen visually against the app's real question-card layout in both light and dark mode.
- New type scale using **Sora** (headings) + **Inter** (body/label/caption/mono), loaded via `expo-font`/`@expo-google-fonts`.
- New `shadows` tokens (2 levels) applied to genuinely singular containers.
- Fix for repeated-list-item cards in `LibraryView`/`HistoryView` ("everything's a card"): extract a shared `ListRow` component, group rows inside one elevated container instead of shadowing each row individually.
- A literal-value audit pass across `src/ui/*.tsx` to catch any hardcoded hex/fontSize that bypasses `theme.ts` (assumed near-zero based on an initial scan of `Card`/`Button`/`Screen`/`ProgressBar`, but not yet verified for every file).
- A small, enumerated set of call-site changes where "selected/current" state visually moves from the old single `accent` to the new `highlight` (amber) token — see §4.

### Out of scope (deferred)
- Native (`Appearance.setColorScheme()`/`StatusBar`) wiring — only the web build is live.
- Any new UI component contracts (variant/size/state props on `Button`, etc.) beyond `ListRow` — rejected in favor of extending existing tokens; see approach discussion below.
- Accessibility state additions unrelated to this pass (e.g. Phase 1's tracked `accessibilityState={{selected}}` follow-up).
- Animation/motion tokens.

## 3. Approach — extend `theme.ts` in place

Two alternatives were considered and rejected:
- A full `src/theme/` folder + formal variant/size/state component contracts (Button `sm/md/lg`, loading states, etc.) — speculative scope; nothing in this app needs it today, and it would touch all 24 already-tested UI components for no functional gain.
- A styling library (NativeWind/Tamagui) — a full rewrite of every `StyleSheet.create` call for what is fundamentally a palette/type/elevation pass.

Instead: same `theme.ts` file, same `Theme` type shape extended with new fields, same `useTheme()` signature (zero call sites touched for the hook itself, mirroring Phase 1). The one new component (`ListRow`) is justified under the design-system promotion rule: it will appear in two or more screens (`LibraryView`, `HistoryView`) with a nameable role and an API smaller than its implementation.

## 4. Token changes (`theme.ts`)

### Colors
`accent`/`accentText` become the **navy** structural color (primary buttons, links, primary CTAs — unchanged semantic, new value):
- light: `accent: '#1e3a5f'`, `accentText: '#ffffff'`
- dark: `accent: '#3a5d8a'`, `accentText: '#ffffff'`

New **`highlight`/`highlightText`** pair (amber) for "selected" / "current" interactive states:
- light: `highlight: '#c2760c'`, `highlightText: '#ffffff'`
- dark: `highlight: '#f0a839'`, `highlightText: '#1e1b4b'`

`positive`/`positiveSurface`/`negative`/`negativeSurface` are **unchanged** — correctness signaling must stay independent of the brand accent (confirmed against both new hues in the visual mockup: no collision).

**Call sites moving from `accent` to `highlight`** (the mechanical part of the two-tone effect — enumerated now so the plan doesn't have to rediscover them):
- `src/ui/QuestionCard.tsx:128` — selected-answer marker
- `src/ui/QuestionMetaFields.tsx:44-48` — selected chip background/border/text
- `src/ui/MatchingQuestionEditor.tsx:166` — `selectedLeft` border
- `src/ui/QuestionGrid.tsx:41` — current-question indicator

**Call sites staying on `accent`** (structural/primary, not "selection"):
- `src/ui/Button.tsx:41` — primary button fill
- `src/ui/Feedback.tsx:62` — reference link color
- `src/ui/ProgressBar.tsx:14` — default/neutral progress tone (only `positive`/`negative` tones are semantic; the neutral fill stays structural navy, not amber)

This split was a judgment call, not visually verified pixel-by-pixel yet — the implementation task's browser-verification step (§6) should sanity-check that amber selection markers read clearly against both light and dark surfaces, and adjust any individual site if it looks wrong in practice.

### Shadows (new export)
```ts
export const shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.06)',
  raised: '0 4px 12px rgba(0, 0, 0, 0.12)',
} as const;
```
Uses the cross-platform `boxShadow` style-prop string (not legacy `shadowColor`/`elevation`), consistent across RN and react-native-web. Applied via `Card`'s existing `styles.card` (default `shadows.card`); `raised` is available for the handful of genuinely elevated singular surfaces (e.g. the results score panel) if the implementer judges it reads better — not mandated everywhere.

### Typography
`type` keeps its existing 5 keys (`title/heading/body/label/caption/mono`) — no call-site changes for typography. Each gets a `fontFamily` and drops `fontWeight` in favor of the loaded weight file (mixing `fontWeight` with a custom font causes browser fake-bold synthesis):

| key | face | weight file |
|---|---|---|
| `title` | Sora | `Sora_700Bold` |
| `heading` | Sora | `Sora_600SemiBold` |
| `body` | Inter | `Inter_400Regular` |
| `label` | Inter | `Inter_600SemiBold` |
| `caption` | Inter | `Inter_400Regular` |
| `mono` | Inter | `Inter_600SemiBold` (keep `fontVariant: ['tabular-nums']`) |

## 5. Font loading

Add `@expo-google-fonts/sora` and `@expo-google-fonts/inter` (both already have `expo-font` as a peer, which is already installed but currently unused). Load the 4 weight files above via `useFonts` in `app/_layout.tsx`'s `RootLayout`, gating render exactly like the existing hydration-gate pattern (`ConsentGate`, `ThemeModeProvider`'s ready-check) — render `null` (or the existing splash) until fonts resolve. No new loading paradigm introduced.

## 6. `ListRow` extraction (fixes "everything's a card")

Current: `LibraryView.tsx:72` and `HistoryView.tsx:36` each wrap every list item in its own `<Card>` — N shadowed boxes stacked in a list once `shadows.card` exists, which would look worse, not better.

New `src/ui/ListRow.tsx`: a pressable row (title + optional trailing content via `children`, matching the existing `Card` children-based API rather than adding content props), with a bottom hairline (`theme.border`) except on the last row, no shadow, no independent border-radius. `LibraryView`/`HistoryView` wrap their row lists in one outer `<Card>` (gets the shadow/elevation once) and render `ListRow` for each item inside it. The resume banner (`LibraryView.tsx:41`) and version-warning/results panels (`ResultsView.tsx`) are singular containers and keep the plain `<Card>` treatment unchanged.

## 7. Screens touched

Every screen already renders through `theme.ts` tokens (confirmed for `Card`/`Button`/`Screen`/`ProgressBar` in this session's scan); the token changes in §4-5 should reach all ~11 routes without per-screen edits. The plan's first task is still an explicit audit (`grep` for hex literals / raw `fontSize`/`fontWeight` outside `theme.ts`) across all of `src/ui/*.tsx`, since that hasn't been verified file-by-file yet — treat it as a real task with a real "found nothing new" or "found N stragglers" outcome, not a rubber stamp.

## 8. Tests

- `theme.test.tsx` (already exists per Phase 1) extends to cover the new `highlight`/`highlightText` fields and `shadows` export.
- New `ListRow.test.tsx` (component contract: renders children, hairline on non-last item, press handling, accessibility role).
- `LibraryView.test.tsx`/`HistoryView.test.tsx` updated for the `ListRow` structural change (list items no longer individually testID'd as `Card`).
- Font loading: extend the existing root-layout hydration test (mirroring Phase 1's `ThemeModeProvider` hydration-gate test) to cover the new font-ready gate.
- Full suite must stay green; no reduction in existing coverage.
- Manual browser verification (puppeteer-core + google-chrome-stable, as in Phase 1 and prior sessions): screenshot every route in both light and dark mode, specifically checking (a) amber selection markers are legible on both surfaces, (b) `LibraryView`/`HistoryView` no longer show stacked per-row shadows, (c) Sora/Inter actually render (not falling back to system font — check network tab or rendered glyph shapes).

## 9. Risks / open questions

- The `accent` → `highlight` split for "selected" states (§4) is a judgment call made from a static mockup, not verified against every live screen; expect at least one site to need adjustment after browser QA, same as Phase 1 surfaced follow-up bugs after each visual change shipped.
- Sora/Inter add ~4 font-weight files to the bundle; not measured against current bundle size — acceptable for a practice-exam app but worth a sanity check if it's ever noticeably slower to first paint.
- `ListRow`'s exact visual spec (padding, hairline inset, whether the last-row-no-border rule needs a `isLast` prop or a `:last-child`-style CSS approach unavailable in RN) is left to the implementer within the component contract described in §6 — the *shape* of the fix is specified, not every pixel.
