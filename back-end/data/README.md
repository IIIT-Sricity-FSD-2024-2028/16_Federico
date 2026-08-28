# Runtime State Snapshots (`back-end/data/`)

This directory contains runtime disk snapshots for the Federico persistence engine (`src/store/persist.js`).

---

## Files Overview

* **`db.json`**: Active disk snapshot containing all saved state across server restarts.
* **`db.json.tmp`**: Temporary write target used during debounced atomic write-and-rename cycles.
* **`db.json.corrupt.<timestamp>`**: Automatic safety backup created if `db.json` fails JSON parsing on server bootstrap.

---

## Persistence Lifecycle & Durability Guarantee

1. **In-Memory Speed:** API mutations modify the in-memory data store directly for instantaneous request handling.
2. **Debounced Atomic Flush:** When mutations occur, state persistence is scheduled with a 300ms debounce window.
3. **Atomic Renames:** The data payload is written to `db.json.tmp` and atomically renamed to `db.json`. On Windows, temporary file lock retries ensure robustness.
4. **Graceful Shutdown:** `SIGINT` and `SIGTERM` signals trigger a synchronous flush to guarantee zero data loss.
5. **Fresh Seed Fallback:** If `db.json` is deleted or missing, the server automatically boots from default seed data in `src/store/dataStore.js` and writes a clean snapshot.

