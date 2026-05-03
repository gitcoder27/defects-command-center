# LeadOS Secret Handling

LeadOS stores Jira API tokens encrypted before writing them to SQLite. The encryption key must live outside the database.

Production should provide one of these environment variables:

- `JIRA_TOKEN_ENCRYPTION_KEY`
- `LEADOS_SECRET_KEY`

Use a 32-byte base64 value when possible. Development can auto-create `data/secrets/jira-token.key`; that path is ignored and is not included in SQLite backups.

To rotate a Jira token:

1. Create a new Jira API token.
2. Update it in LeadOS Settings or set `JIRA_API_TOKEN` in the runtime environment.
3. Run the Settings connection test.
4. Revoke the old Jira token in Atlassian.

To rotate the encryption key, set the new key, re-save the Jira token from Settings, verify sync, and remove the old key from the host.
