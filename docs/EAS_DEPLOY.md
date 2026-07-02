# EAS Auto-Deploy Runbook

Merge to `main` → GitHub Actions runs `eas build --platform all --profile
production --auto-submit`. Builds land in **TestFlight** (iOS) and the **Play
internal** track (Android). Public store release stays manual.

Workflow: [.github/workflows/deploy.yml](../.github/workflows/deploy.yml).
Submit config: [eas.json](../eas.json) → `submit.production`.

---

## One-time setup

Do these once. Until they are complete the workflow will fail (or is inert
without `EXPO_TOKEN`), so no accidental deploys happen early.

### 1. Apple / App Store Connect

1. Create the app record in App Store Connect (bundle id `id.comuna.app`).
   - Copy the **App ID** (numeric, aka `ascAppId`) and your **Apple Team ID**.
2. In `eas.json`, replace the two placeholders under `submit.production.ios`:
   - `ascAppId` → the numeric App ID
   - `appleTeamId` → your 10-char team id
3. Generate an **App Store Connect API key**: ASC → Users and Access → Integrations
   → App Store Connect API → generate key with **App Manager** role. Download the
   `.p8` and note the **Key ID** + **Issuer ID**.
4. Upload it to EAS (stored on EAS servers, not GitHub):
   ```
   eas credentials
   # platform: iOS → App Store Connect API Key → set up new key
   # provide the .p8 path, Key ID, Issuer ID
   ```

### 2. Google Play

1. Create the app in Play Console (package `id.comuna.app`).
2. **Upload the first AAB manually** to any track (e.g. internal) once. Play
   blocks API uploads until at least one manual release exists — this is the
   single most common cause of the first automated submit failing.
3. Create a service account: Google Cloud Console → IAM → Service Accounts →
   create → download JSON key. In Play Console → Users & permissions → invite the
   service-account email → grant **Release to testing tracks** (and app access).
4. Upload the JSON to EAS:
   ```
   eas credentials
   # platform: Android → Google Service Account → upload key for submissions
   ```

### 3. GitHub secret

1. Create an Expo access token: https://expo.dev → account settings → Access
   Tokens (a robot account is recommended).
2. Repo → Settings → Secrets and variables → Actions → New repository secret:
   - Name: `EXPO_TOKEN`
   - Value: the token

---

## How it runs

- Trigger: push to `main`, or manual via Actions → Deploy → Run workflow.
- Versioning is automatic: `appVersionSource: remote` + `autoIncrement: true`
  means EAS bumps the build number. Bump the marketing version (`expo.version` in
  `app.json`) manually when you want a new user-facing version.
- Android uploads as `releaseStatus: draft` on the internal track — review and
  click release in Play Console. iOS appears in TestFlight after Apple processing.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Play submit: "changes are not allowed / no prior release" | Do the manual first-AAB upload (step 2.2). |
| iOS submit: missing ascAppId / team | Fill placeholders in `eas.json` (step 1.2). |
| Workflow: EAS auth failed | `EXPO_TOKEN` secret missing or expired. |
| Submit hangs / prompts | Ensure creds are stored on EAS (`eas credentials`); CI runs `--non-interactive`. |

## Promoting to public release

This pipeline stops at TestFlight / Play internal on purpose. To ship publicly:
- iOS: App Store Connect → add the TestFlight build to an App Store version → submit for review.
- Android: Play Console → promote the internal release to production.
