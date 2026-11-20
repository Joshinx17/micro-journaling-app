# From GitHub to Google Play

## 1. Clone and validate

```powershell
git clone https://github.com/Joshinx17/micro-journaling-app.git
cd micro-journaling-app
npm ci
npm run typecheck
npm test
```

Use a short Windows path such as `D:\dev\mindlog` if you build locally. Long paths can make CMake/Ninja fail during native compilation.

## 2. Create the Play developer account

Create or use a Google Play Console developer account, complete identity verification, and create a new app with the permanent package name `com.mindlog.app`. Package names cannot be changed after publication.

## 3. Build a production AAB

The repository includes `eas.json` for Expo Application Services. Install and log in to EAS:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile production
```

When EAS asks about Android credentials, let EAS generate and manage the upload keystore unless you already have a permanent upload key. Save the credentials securely. EAS produces a signed `.aab` and gives you a download URL.

For a fully local build, create a release keystore, set the four `MINDLOG_` environment variables documented in `PLAY_RELEASE.md`, move the checkout to a short path, run `npx expo prebuild --clean --platform android`, then run `npm run android:bundle`.

## 4. Test before production

Upload the AAB to Play Console's internal testing track. Test a clean install and upgrade install on multiple Android versions. Verify onboarding, folder permissions, journaling, search, export, snapshots, recovery, process death, low storage, accessibility, themes, and large text.

Fix every crash or data-loss issue shown in the Play pre-launch report before continuing.

## 5. Complete the listing and policy forms

Use `STORE_LISTING.md`, `PRIVACY.md`, the icon, the feature graphic, and screenshots from the signed build. Host the privacy policy at a public HTTPS URL and replace the placeholders for support email and policy URL.

Complete the content rating, target audience, ads declaration, Data safety, app access, and developer contact forms truthfully from the final bundle. MindLog has no login, ads, analytics SDK, or backend in this repository; it stores files selected by the user and can share content when the user invokes Android sharing.

## 6. Closed testing and production

If the developer account is a new personal account subject to Google's testing gate, create a closed test with at least 12 testers continuously opted in for 14 days. Apply for production access after the test. Otherwise, proceed from internal testing to closed testing and then staged production rollout according to Play Console.

## 7. Release operations

Start with a staged rollout, monitor Android vitals and reviews, and keep the upload key and Play App Signing recovery information backed up. For every future update, increase `expo.version` and `android.versionCode`, run the checks, build a new AAB, and upload it as an update to the same Play listing.
