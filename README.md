# Practice Test App

A generic, JSON-driven practice-exam app built with [Expo](https://expo.dev) —
create, import, and take practice tests across five question types, with
full mock-exam and practice-mode scoring, on web, iOS, and Android from
one codebase.

**🔗 Try the web build:** <https://rvpdev.github.io/practice-test-app/>
(auto-deployed from `main` — see [Deployment](#deployment))

## What's in here

- **Mock mode** (timed, scored against a passing threshold) and
  **practice mode** (untimed, instant feedback per question).
- **Five question types**: single/multi-choice, true/false, ordering,
  and matching.
- **Build your own sets** right in the app, or import/export sets as
  JSON files.
- **Attempt history** with per-topic score breakdowns.
- A free, bundled CompTIA A+ Core 1 (220-1201) practice exam —
  independently authored, not official CompTIA content. See
  [TERMS.md](./TERMS.md) for the full disclaimer.

All data — imported sets, sets you build, attempt history — lives only
on your own device or browser. Nothing is sent to a server. See
[PRIVACY.md](./PRIVACY.md).

## Tech stack

- [Expo](https://expo.dev) + [Expo Router](https://docs.expo.dev/router/introduction/)
  (file-based routing, universal across web/iOS/Android)
- React Native + React Native Web, TypeScript
- [Zod](https://zod.dev) for question-set schema validation
- Jest, `@testing-library/react-native`, and `expo-router/testing-library`
  for unit and route-integration tests

## Getting started

```bash
npm install
npx expo start
```

Then pick a target from the Expo CLI output — web, an iOS simulator, an
Android emulator, or a physical device via Expo Go / a dev build.

Platform shortcuts:

```bash
npm run web       # expo start --web
npm run ios       # expo start --ios
npm run android   # expo start --android
```

## Testing

```bash
npm test          # Jest: unit tests + app/** route integration tests
npm run typecheck # tsc --noEmit
npm run lint      # expo lint
```

## Project structure

```
app/            Expo Router routes (screens + navigation)
src/core/       Question-set schema, validation, scoring, session logic (platform-agnostic)
src/ui/         Screen view components and shared UI
src/data/       Persistence (AsyncStorage-backed repository) and bundled content loading
content/        Bundled practice-exam JSON (Core 1 live; Core 2 & Security+ held back)
__tests__/app/  Integration tests for the app/** route layer
```

## Deployment

Every push to `main` runs
[`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml),
which builds the static web export and deploys it to GitHub Pages
automatically.

## License

This project is **not** open source — see [LICENSE](./LICENSE). Use of
the hosted app is governed by [TERMS.md](./TERMS.md); see also
[PRIVACY.md](./PRIVACY.md).
