# EAS Auto-Deploy on Merge to Main — Design

**Date:** 2026-07-02
**Status:** Approved (design)

## Goal

On every merge to `main`, automatically build production iOS + Android binaries
on EAS and submit them to **TestFlight** (iOS beta) and the **Play internal
testing track** (Android). Promotion to public store release stays manual.

## Decisions

| Topic | Choice |
|-------|--------|
| Release target | TestFlight + Play internal track (not public production) |
| Build engine | EAS Build (Expo cloud) — keep existing setup |
| CI runner | GitHub Actions (`.github/workflows/deploy.yml`) |
| Credential storage | Uploaded to EAS servers via `eas credentials`; CI holds only `EXPO_TOKEN` |
| Versioning | `appVersionSource: remote` + `autoIncrement: true` (EAS bumps build numbers) |

## Architecture / Flow

```
push to main
  → GitHub Actions job
     → checkout + node 20 + npm ci
     → setup EXPO_TOKEN (expo/expo-github-action)
     → eas build --platform all --profile production --auto-submit --non-interactive
        → EAS Build compiles iOS (.ipa) + Android (.aab) in Expo cloud
        → --auto-submit chains eas submit per platform, using submit.production config
           → iOS  : upload to App Store Connect → appears in TestFlight after processing
           → Android: upload to Play internal track
```

Single `eas build ... --auto-submit` command performs both build and submit. No
separate submit job needed. Credentials (ASC API key `.p8`, Play service-account
JSON) live on EAS servers, so the workflow never handles raw secrets.

## Files

1. **`eas.json`** — populate `submit.production`:
   - `ios`: `ascAppId`, `appleTeamId` (ASC API key resolved from EAS-stored creds).
   - `android`: `track: "internal"`, `releaseStatus: "draft"` (safe default; first
     API upload requires a prior manual release — see prerequisites).
2. **`.github/workflows/deploy.yml`** — trigger `push: branches: [main]`; steps:
   checkout → `actions/setup-node@v4` (node 20, npm cache) → `npm ci` →
   `expo/expo-github-action@v8` with `eas-version: latest` + `token: EXPO_TOKEN` →
   run build+auto-submit. `concurrency` group cancels superseded runs.
3. **`docs/EAS_DEPLOY.md`** — one-time setup + prerequisites runbook.

## One-Time Prerequisites (manual, documented in runbook)

- **App Store Connect**: app record must exist → provides `ascAppId` + `appleTeamId`.
  Generate ASC API key (`.p8`, Key ID, Issuer ID) with App Manager role.
- **Google Play Console**: app created AND **first AAB uploaded manually once** —
  Play blocks API uploads to any track until one manual release exists. Create a
  service account (Google Cloud) + grant release permission in Play Console; download JSON.
- Run `eas credentials` locally once per platform to upload ASC key + Play JSON to EAS.
- Set repo secret `EXPO_TOKEN` (Expo access token, robot user recommended).

## Error Handling / Safety

- `--non-interactive` fails fast in CI instead of hanging on prompts.
- `releaseStatus: draft` on Android → uploaded but not auto-rolled-out; manual click to release.
- `concurrency` cancels in-flight runs so only the latest main commit deploys.
- Workflow is inert until `EXPO_TOKEN` + EAS-stored creds exist — no accidental
  deploys before setup complete.

## Out of Scope (YAGNI)

- Public/production store rollout automation.
- Preview/PR builds, changelog generation, Slack notifications.
- fastlane (explicitly rejected earlier — EAS covers this).
