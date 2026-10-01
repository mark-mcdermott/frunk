# App Store submission

Where the iOS app stands, and the steps left that only an Apple Developer account can
take. The engineering is in `docs/PORT-PLAN.md` ("After the port") and `CLAUDE.md`; this
file is the checklist.

**Not yet.** Submission waits on a week of real use ("Next, in this order" in the plan).
Steps 1–3 below are also how the app gets onto a phone for that week; steps 4–8 come
after it.

## What is already true of the build

- **It is an app, not a wrapper.** The applet is bundled (`pnpm build:native`), launches
  with no network, and talks to the API as a client. Guideline 4.2 is about that.
- **It does things a browser tab cannot.** Passkey sign-in through the system sheet,
  push notifications for maintenance and renewal reminders, the camera for receipts and
  photos, the share sheet for the history PDF and for stored documents.
- **A reviewer needs no credentials.** "Explore the demo" on the first screen opens a
  full account with sample data. Say so in the review notes.
- **Accounts can be deleted in the app** (Profile → Delete Account), which Guideline
  5.1.1(v) requires of any app that creates them.
- **No third-party sign-in**, so Sign in with Apple is not required. **No purchases**,
  so there is nothing for Guideline 3.1 to object to — keep any tip or donation link out
  of the app; it belongs on the website.
- **Identity**: bundle id `com.frunk.app`, team `VRFF4MSHAC`, version 1.0 (1), iPhone
  only, iOS 15 and later. Its own icon and launch screen (sources in `assets/`,
  regenerated with `npx @capacitor/assets generate --ios --android`).
- **Info.plist** carries the camera and photo-library usage strings and
  `ITSAppUsesNonExemptEncryption = false` (the app uses only HTTPS and the system's own
  cryptography, which is exempt).
- **Entitlements**: `webcredentials:frunk.cloud` for passkeys and password autofill, and
  `aps-environment` for push. Xcode switches the latter to `production` in an archive
  signed for distribution.

## What the simulator has and has not shown

Run against production in the iPhone 17 Pro simulator, 2026-10-01: the demo starts; a
demo is kept with a passkey through the system sheet; signing out and back in with that
passkey opens a session for the same account (confirmed from the server, not the
screen); the history PDF reaches the share sheet; "Notify me on this phone" raises the
permission prompt; and a notification delivered with `xcrun simctl push` opens the
vehicle it names when tapped.

**Not shown: a real device token.** The simulator gets one from Apple's sandbox push
service, and from the machine this was run on that service could not be reached (`apsd`
logs "Connected on 0 interfaces"). The switch then says the phone could not be
registered, which is the truth. The first real token, and the first notification the
server itself sends, are steps 1 and 3 below.

## What needs your Apple account

1. **Push key.** developer.apple.com → Certificates, Identifiers & Profiles → Keys → add
   a key with _Apple Push Notifications service (APNs)_. Download the `.p8` once. Then on
   Vercel (Production), as Sensitive variables: `APNS_KEY` (the file's contents),
   `APNS_KEY_ID` (the key's id), `APNS_TEAM_ID` (`VRFF4MSHAC`). Until they exist the app
   registers phones and nothing is sent to them.
2. **App ID capabilities.** The identifier `com.frunk.app` needs _Push Notifications_ and
   _Associated Domains_ enabled. Xcode's automatic signing does this the first time the
   project is opened with your account selected (`pnpm cap:ios`, then Signing &
   Capabilities).
3. **A run on a real phone.** Plug in an iPhone, select it in Xcode, Run. Check: the demo
   starts; "Add a passkey and keep it" raises the Face ID sheet; Profile → Reminders →
   "Notify me on this phone" asks for permission and stays on; a receipt can be added
   from the camera; History (PDF) opens the share sheet.
4. **The App Store Connect record.** appstoreconnect.apple.com → My Apps → New App: name
   _Frunk_, bundle id `com.frunk.app`, SKU of your choosing, primary language English.
5. **The listing.**
   - Screenshots at 6.9" (1320 × 2868): garage, a vehicle with its schedule and
     renewals, a repair with receipts, the history PDF. Taken in the iPhone 17 Pro Max
     simulator with the demo, they need no retouching.
   - Description, keywords, support URL `https://frunk.cloud/contact`, privacy policy
     URL `https://frunk.cloud/privacy`, category _Utilities_ (or _Lifestyle_).
   - **App Privacy**: data linked to the user — email address, name, user content
     (vehicles, repairs, notes, photos and documents), device ID (the push token). Not
     used for tracking; no third-party advertising or analytics in the app.
   - Age rating: 4+.
6. **Archive and upload.** Xcode → Product → Archive (destination _Any iOS Device_),
   then Distribute App → App Store Connect. Bump the build number for each upload.
7. **TestFlight first.** Install the uploaded build from TestFlight and repeat step 3;
   this is the first build that uses the production push environment.
8. **Submit for review**, with a note along these lines: _"No account is needed to
   review the app: tap 'Explore the demo' on the first screen for a full account with
   sample data. Notifications are opt-in under Profile → Reminders."_

## If review pushes back

- **4.2 (minimum functionality)**: point to the bundled, offline-launching app and the
  native features above. This is the rejection the bundling exists to prevent.
- **5.1.1 (data collection)**: account deletion is under Profile; the demo requires no
  personal data at all.
- **2.1 (crashes or bugs)**: reproduce in TestFlight on the device class they name;
  the reviewer's notes usually say which screen.

## Android

The shell bundles the same applet and its passkeys work the same way
(`public/.well-known/assetlinks.json`). Not ready for the Play Store: push needs a
Firebase project and its `google-services.json`, an FCM sender beside the APNs one, and
the release signing certificate's fingerprint added to `assetlinks.json`.
