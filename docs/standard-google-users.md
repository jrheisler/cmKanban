# Standard Google Users

Use these shared Google accounts whenever you need to configure OAuth for KanbanX or run end-to-end tests that rely on Google Drive. Credentials (password + 2FA backup codes) are stored in the **Standard Google Users** vault in 1Password.

| Label | Email | Notes |
| ----- | ----- | ----- |
| Standard Google User — Alpha | standard-google-alpha@kanbanx.dev | Primary account for Drive sync and automated QA runs. |
| Standard Google User — Beta | standard-google-beta@kanbanx.dev | Backup account; use when Alpha is rate-limited or under review. |
| Standard Google User — Gamma | standard-google-gamma@kanbanx.dev | Reserved for staging/experiments. |

If a password rotation occurs, update the 1Password entries and add a note to this table. When a new shared account is provisioned, append it here so everyone knows it is available.

## Accessing credentials safely

1. Open 1Password → **Shared vaults → Standard Google Users**.
2. Copy the username and password for the account you intend to use.
3. Use the OTP generator stored with the entry when Chrome prompts for two-factor authentication.

## Usage guidelines

- **Do not** sign these accounts into personal Chrome profiles. Use the dedicated testing profile shipped with the QA checklist.
- Keep the accounts enrolled in the Google Cloud organisations that host our test projects so consent screens stay approved.
- If you see security alerts (recovery emails, device approvals), acknowledge them and document the event in the project Slack channel.

For any missing information, ping the DevOps channel so the roster stays accurate.
