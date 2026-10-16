'use strict';

/**
 * Reset Database to Canonical Default Mock Data
 *
 * Restores back-end/data/db.json to 100% parity with back-end/src/store/dataStore.js,
 * prunes transient upload artifacts, and touches server.js to trigger a clean
 * in-memory reload in the running nodemon development server.
 *
 * Usage:
 *   npm run db:reset
 *   node scripts/reset-database.js
 */

const fs = require('fs');
const path = require('path');

const dataStore = require('../src/store/dataStore');
const dbPath = path.resolve(__dirname, '../data/db.json');
const serverPath = path.resolve(__dirname, '../server.js');
const uploadsDir = path.resolve(__dirname, '../uploads');

function resetDbJson() {
  const collectionNames = Object.keys(dataStore);
  const jsonContent = JSON.stringify(dataStore, null, 2) + '\n';
  fs.writeFileSync(dbPath, jsonContent, 'utf8');

  console.log(`\n======================================================`);
  console.log(`✅  DATABASE RESTORED TO DEFAULT MOCK DATA`);
  console.log(`======================================================`);
  console.log(`📁 File updated:    ${dbPath}`);
  console.log(`📦 Collections:     ${collectionNames.length} canonical collections restored`);
  console.log(`👤 Users:           ${dataStore.users.length} default accounts (101–113)`);
  console.log(`🏥 Patients:        ${dataStore.patients.length} default patients (201–229)`);
  console.log(`🛏️  Beds:            ${dataStore.beds.length} beds (76 total)`);
  console.log(`📋 Admissions:      ${dataStore.admissions.length} admissions (701–719)`);
  console.log(`📜 Activity Logs:   ${dataStore.activityLog.length} seed logs (1–155)`);
  console.log(`======================================================`);
}

function pruneUploads() {
  const subdirs = ['documents', 'branding'];
  let prunedCount = 0;

  subdirs.forEach((sub) => {
    const dir = path.join(uploadsDir, sub);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach((file) => {
        if (file !== '.gitkeep') {
          try {
            fs.unlinkSync(path.join(dir, file));
            prunedCount++;
          } catch {
            // Ignore files locked by active processes
          }
        }
      });
    }
  });

  if (prunedCount > 0) {
    console.log(`🧹 Pruned ${prunedCount} transient upload artifacts.`);
  }
}

function touchServer() {
  if (fs.existsSync(serverPath)) {
    const now = new Date();
    try {
      fs.utimesSync(serverPath, now, now);
      console.log(`🔄 Touched server.js -> Nodemon will reload fresh in-memory state.`);
    } catch (err) {
      console.warn(`⚠️ Could not touch server.js: ${err.message}`);
    }
  }
}

function main() {
  try {
    resetDbJson();
    pruneUploads();
    touchServer();
    console.log(`✨ All reset tasks completed successfully.\n`);
  } catch (err) {
    console.error(`❌ Failed to reset database: ${err.message}`);
    process.exit(1);
  }
}

main();
