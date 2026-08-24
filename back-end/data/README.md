# Runtime State Snapshots (`back-end/data/`)

This directory is the runtime storage directory for the backend persistence engine (`src/store/persist.js`).

## Files:
* **`db.json`**: Active disk snapshot containing all saved state across server restarts.
* **`db.json.tmp`**: Temporary write target used for crash-safe atomic renames.
* **`db.json.corrupt.<timestamp>`**: Automatic safety backup generated if `db.json` is ever corrupted on startup.

> **Note:** `db.json` is gitignored and re-created automatically from `src/store/dataStore.js` seed data if deleted.
