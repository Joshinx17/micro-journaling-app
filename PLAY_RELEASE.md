# Google Play release checklist

## Repository preparation

- Confirm `com.mindlog.app` is the intended permanent Play package name. Once published, it cannot be changed for this listing.
- Set a unique, increasing `android.versionCode` in `app.json` for every Play upload and keep `expo.version` and `package.json` in sync. The current first-upload code is 1.
- Replace the generated Expo launcher icon with final MindLog artwork and configure `expo.icon` and `android.adaptiveIcon`. Create a Play feature graphic and screenshots from a real release build.
- Publish `PRIVACY.md` at a public URL after adding a working contact address. Link the URL in Play Console and in the app before submission.
- Run `npm ci`, `npm run typecheck`, `npm test`, and `npx expo prebuild --clean --platform android`. Review the resulting merged manifest and release permissions.

## Signed Android App Bundle

Create and securely back up an upload keystore outside version control. Set `MINDLOG_KEYSTORE_PATH`, `MINDLOG_KEYSTORE_PASSWORD`, `MINDLOG_KEY_ALIAS`, and `MINDLOG_KEY_PASSWORD` in the build environment. The keystore path is relative to `android/app` unless absolute. Never commit the keystore or passwords.

Run `npm run android:bundle` on Windows. The signed bundle is under `android/app/build/outputs/bundle/release/`. Verify its certificate, package ID, version code, target SDK, size, and permissions before uploading it to an internal test track. Enroll in Play App Signing and retain the upload key securely.

## Device and Play Console gates

- Test the signed release on an Android 16 device and at least one older supported Android version. Exercise onboarding, SAF permission revocation, create/edit/delete/search, profile photo, export, snapshot, fresh-install restore, low storage, process death, large font, TalkBack, and light/dark themes. Check Play pre-launch report and fix crashes or layout issues.
- Prepare truthful store copy, app icon, feature graphic, screenshots, support contact, category, content rating, target audience, ads declaration, and Data safety answers based on the final bundle and actual storage-provider behavior. Do not claim encryption or cloud backup supplied by MindLog.
- If the developer account is a personal account created after 13 November 2023, complete Google's required closed test and production-access application before production rollout.
- Upload to internal testing, then closed testing where required, then staged production. Monitor Android vitals and user feedback after release.

This checklist needs owner-supplied signing credentials, artwork, public policy hosting, Play Console access, and physical-device testing. A local build alone cannot complete those gates.
