# Google Drive OAuth Setup

Google Drive sync relies on Chrome's `identity` API, which needs a published OAuth 2.0 client ID in the extension manifest. Follow these steps before attempting to connect from the side panel.

## 1. Choose the account that will own the credentials

Use one of the organisation's shared "Standard Google Users" so the client ID is maintained with the rest of our test infrastructure. The current roster and credential storage locations live in [docs/standard-google-users.md](./standard-google-users.md).

> **Tip:** Using a personal Google account will break automated QA flows. Stick to the shared identities.

## 2. Create (or select) a Google Cloud project

1. Visit [https://console.cloud.google.com/](https://console.cloud.google.com/) and sign in with the chosen standard account.
2. Create a new project named something like **KanbanX Drive Sync** or reuse the existing project for this extension.
3. Make sure you stay within the shared organisation so other teammates can see the project.

## 3. Configure the OAuth consent screen

1. Navigate to **APIs & Services → OAuth consent screen**.
2. Select **Internal** (the extension is only used by our team) and complete the application details.
3. Add the `https://www.googleapis.com/auth/drive.appdata` scope under **Scopes**.
4. Add the teammates who will test the feature under **Test users** (the same standard accounts are fine).

## 4. Enable the Google Drive API

1. Go to **APIs & Services → Enabled APIs & services**.
2. Click **+ Enable APIs and Services**, search for **Google Drive API**, and enable it for the project.

## 5. Lock the extension ID

1. Load the unpacked extension and open the background service worker console. It now prints `EXT_ID <value>` on startup.
2. Copy the ID shown there (or from `chrome://extensions`).
3. In the Chrome Web Store Developer Dashboard, open **Package → View public key** and copy the public key.
4. Paste the key into [`manifest.json`](../manifest.json) under the top-level `"key"` field so the unpacked and packaged IDs stay in sync.

> **Why this matters:** Google OAuth for Chrome extensions requires that the OAuth client **Item ID** matches the extension ID exactly. Setting the manifest `key` locks the ID across rebuilds.

## 6. Create the Chrome extension OAuth client

1. Open **APIs & Services → Credentials** and click **Create credentials → OAuth client ID**.
2. Choose **Chrome App** as the application type.
3. When prompted for the application ID, supply the extension ID shown in `chrome://extensions` after loading KanbanX in developer mode.
4. Click **Create** to generate the client. Copy the **Client ID** that is displayed.

## 7. Update `manifest.json`

1. Open the project locally and edit [`manifest.json`](../manifest.json).
2. Replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` with the client ID you just copied.
3. Confirm that the `oauth2.scopes` array contains `https://www.googleapis.com/auth/drive.appdata`.
4. Save the file and reload the extension from `chrome://extensions`.

If you're preparing a build for distribution, double-check that the committed manifest contains the correct client ID. Never commit secrets such as client secrets—only the public client ID belongs in source control.

## 8. Verify the integration

1. Reload the side panel and click **Connect to G-Drive**.
2. Chrome should open an OAuth prompt for the selected standard Google user.
3. The console logs a non-empty auth token (`KanbanX: Drive token acquired ...`) followed by the result of listing the AppData files (`KanbanX: AppData files ...`).
4. After authorising, the button should show **G-Drive Connected** and the notice should confirm the connection.

## 9. Rotating or replacing credentials

If you regenerate the client ID, update `manifest.json`, notify the team, and re-upload the updated package wherever it is distributed. All testers will need to reload the extension to pick up the new ID.

For further reference or troubleshooting tips, drop notes in this document so future maintainers know the latest process.
