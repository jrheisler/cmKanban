# Preparing KanbanX for Google Drive Storage

Follow these steps to configure a fresh checkout of the extension so Google Drive backup works without runtime errors. The checklist assumes you are targeting Chrome MV3 and using the shared "Standard Google Users" accounts from the QA vault.

## 1. Confirm prerequisites

- Latest Chrome (or Chromium) with the `chrome://extensions` page available.
- Access to the repository and the [Standard Google Users](./standard-google-users.md) credentials in 1Password.
- Rights to create OAuth credentials within the shared Google Cloud organisation.
- Ability to edit the extension manifests locally.

## 2. Pull the latest source

```bash
git clone git@github.com:company/cmKanban.git
cd cmKanban
```

If you already have a checkout, pull the latest `main` branch and ensure there are no uncommitted changes before editing the manifests.

## 3. Load the development manifest

Run the helper script so the active [`manifest.json`](../manifest.json) matches the development configuration.

```bash
./scripts/use-manifest.sh dev
```

This copies [`manifest.dev.json`](../manifest.dev.json) over the root manifest, keeping the OAuth client placeholders in place until you supply the real IDs.

## 4. Lock the extension ID (first-time setup only)

1. Load the unpacked extension in Chrome and open the background service worker console.
2. Note the `EXT_ID ...` value logged on startup (or read it from `chrome://extensions`).
3. Paste the published key from the Chrome Web Store dashboard into the `"key"` field of `manifest.dev.json` so the unpacked ID matches the published ID. This prevents OAuth from rejecting the extension because of an ID mismatch.

## 5. Create or reuse a Google Cloud project

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) with a Standard Google User.
2. Create a new project (for example **KanbanX Drive Sync**) or reuse the shared project that already hosts the OAuth credentials.
3. Verify the project lives inside the shared organisation so teammates retain access.

## 6. Configure the OAuth consent screen

1. Open **APIs & Services → OAuth consent screen**.
2. Choose the **Internal** user type and complete the app details (name, email, support links).
3. Add the `https://www.googleapis.com/auth/drive.appdata` scope.
4. Add every Standard Google User (and any other testers) under **Test users**.

## 7. Enable the Google Drive API

In **APIs & Services → Enabled APIs & services**, click **+ Enable APIs and Services**, search for **Google Drive API**, and enable it for the project.

## 8. Create Chrome App OAuth client IDs

You need two client IDs so development and production builds can authenticate independently.

1. Visit **APIs & Services → Credentials**.
2. Choose **Create credentials → OAuth client ID → Chrome App**.
3. For the dev client, enter the unpacked extension ID gathered in step 4.
4. For the production client, enter the Chrome Web Store item ID of the published extension.
5. Copy both resulting **Client ID** values for the next step.

## 9. Update the manifests

1. Replace `DEV_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in [`manifest.dev.json`](../manifest.dev.json) with the dev client ID.
2. Replace `PROD_GOOGLE_CLIENT_ID.apps.googleusercontent.com` in [`manifest.prod.json`](../manifest.prod.json) with the production client ID.
3. Confirm both manifests list the `identity`, `identity.email`, `storage`, `contextMenus`, `notifications`, and `tabs` permissions plus the Drive `appData` OAuth scope. The helper script only copies files; it does not validate permissions for you.

## 10. Verify the runtime guard rails

Open [`auth/driveAuth.js`](../auth/driveAuth.js) and ensure the placeholders you replaced no longer appear. The module throws if the active manifest still contains a placeholder client ID, which is a quick signal that the manifest swap failed.

## 11. Load and test the extension

1. Run `./scripts/use-manifest.sh dev` again to confirm the dev manifest is active.
2. Load the extension via **Load unpacked** in `chrome://extensions`.
3. Open the side panel, click **Connect to G-Drive**, and complete the OAuth prompt using a Standard Google User.
4. Watch the console for `KanbanX: Drive token acquired ...` and `KanbanX: AppData files ...` messages. These confirm the Drive API calls succeed with the configured client ID.

## 12. Prepare for production packaging

When you are ready to ship, run `./scripts/use-manifest.sh prod` so the production manifest is staged as `manifest.json`. Zip the extension or let the CI packaging script run, then upload the archive to the Chrome Web Store. Remember that the Web Store injects the published key automatically—do not add it to `manifest.prod.json`.

Keep the OAuth client IDs in sync with every release. If you rotate credentials, update both manifests, re-run the helper script, and notify the team so they can reload their extensions.
