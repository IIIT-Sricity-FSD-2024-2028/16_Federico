'use strict';

const fs = require('fs');
const path = require('path');
const dataStore = require('../store/dataStore');

const sql = fs.readFileSync(path.resolve(__dirname, '../../../Database/generate_database.sql'), 'utf8');

function parseSqlValueRows(table) {
  const pattern = new RegExp(`INSERT INTO ${table} \\(([^)]+)\\) VALUES\\s*`, 'g');
  const result = [];
  for (const match of sql.matchAll(pattern)) {
    const columns = match[1].split(',').map((column) => column.trim());
    let end = match.index + match[0].length;
    let quoted = false;
    for (; end < sql.length; end++) {
      if (sql[end] === "'") {
        if (quoted && sql[end + 1] === "'") end++;
        else quoted = !quoted;
      } else if (!quoted && sql[end] === ';') {
        break;
      }
    }
    const body = sql.slice(match.index + match[0].length, end);
    let inString = false;
    let token = '';
    let values = [];
    let rowOpen = false;
    const pushValue = () => {
      const raw = token.trim();
      if (raw === 'NULL') values.push(null);
      else if (raw === 'TRUE') values.push(true);
      else if (raw === 'FALSE') values.push(false);
      else if (/^-?\d+(?:\.\d+)?$/.test(raw)) values.push(Number(raw));
      else values.push(raw);
      token = '';
    };
    for (let i = 0; i < body.length; i++) {
      const char = body[i];
      if (char === "'") {
        if (inString && body[i + 1] === "'") {
          token += "'";
          i++;
        } else {
          inString = !inString;
        }
      } else if (!inString && char === '(') {
        rowOpen = true;
        values = [];
        token = '';
      } else if (!inString && (char === ',' || char === ')') && rowOpen) {
        pushValue();
        if (char === ')') {
          result.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
          rowOpen = false;
        }
      } else if (rowOpen) {
        token += char;
      }
    }
  }
  return result;
}

function sqlTime(value) {
  if (value == null) return null;
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

function compareTable(table, collection, columns, key) {
  const rows = parseSqlValueRows(table).map((row) => columns.map((column) => row[column]));
  const canonical = dataStore[collection]
    .map((row) => columns.map((column) => column.endsWith('_at') || column.endsWith('_time') ? sqlTime(row[column]) : row[column]))
    .sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[1] || 0) - Number(b[1] || 0));
  rows.sort((a, b) => Number(a[0]) - Number(b[0]) || Number(a[1] || 0) - Number(b[1] || 0));
  expect(rows).toEqual(canonical);
  const ids = rows.map((row) => `${row[0]}:${key ? row[1] : ''}`);
  expect(new Set(ids).size).toBe(ids.length);
}

describe('SQL billing seed matches canonical JSON seed', () => {
  it('uses the declared discharge-summary column and matches all summary rows', () => {
    expect(sql).toMatch(/INSERT INTO discharge_summaries \([^)]*discharge_notes/);
    expect(sql).not.toMatch(/INSERT INTO discharge_summaries \([^)]*\bnotes\b/);
    compareTable('discharge_summaries', 'dischargeSummaries', ['summary_id', 'admission_id', 'patient_id', 'discharge_notes', 'final_amount', 'gross_amount', 'insurance_deduction', 'generated_at', 'organization_id', 'hospital_id']);
  });

  it('enforces hospital ownership with composite tenant foreign keys', () => {
    expect(sql).toMatch(/UNIQUE KEY uq_hospital_tenant \(hospital_id, organization_id\)/);
    const tenantTables = [
      'users', 'doctors', 'doctor_availabilities', 'wards', 'beds', 'services',
      'patients', 'patient_insurances', 'appointments', 'admissions',
      'discharge_summaries', 'ledgers', 'ledger_entries', 'payments', 'receipts',
      'leaders', 'inventory_items', 'purchase_requests', 'pre_requests',
      'bed_requests', 'emergency_notifications', 'activity_log',
    ];
    for (const table of tenantTables) {
      const definition = sql.match(new RegExp(`CREATE TABLE ${table} \\(([\\s\\S]*?)\\) ENGINE=`));
      expect(definition).not.toBeNull();
      expect(definition[1]).toMatch(/FOREIGN KEY \(hospital_id, organization_id\) REFERENCES hospitals\(hospital_id, organization_id\) ON DELETE RESTRICT/);
    }
    expect(sql).not.toMatch(/FOREIGN KEY \(hospital_id\) REFERENCES hospitals\(hospital_id\)/);
  });

  it('provides a live negative SQL check for cross-organization hospital references', () => {
    const negativeCheck = fs.readFileSync(path.resolve(__dirname, '../../../Database/test_tenant_integrity.sql'), 'utf8');
    expect(negativeCheck).toMatch(/verify_hospital_tenant_constraint/);
    expect(negativeCheck).toMatch(/SQLSTATE '23000'/);
    expect(negativeCheck).toMatch(/cross-organization hospital reference was accepted/i);
  });

  it('has no hospital/organization ownership mismatch in the canonical seed', () => {
    const hospitals = new Map(dataStore.hospitals.map((hospital) => [Number(hospital.hospital_id), Number(hospital.organization_id)]));
    const scopedCollections = [
      'users', 'doctors', 'doctorAvailabilities', 'wards', 'beds', 'services',
      'patients', 'patientInsurances', 'appointments', 'admissions',
      'dischargeSummaries', 'ledgers', 'ledgerEntries', 'payments', 'receipts',
      'leaders', 'inventoryItems', 'purchaseRequests', 'preRequests',
      'bedRequests', 'emergencyNotifications', 'activityLog',
    ];
    for (const collection of scopedCollections) {
      for (const row of dataStore[collection]) {
        if (row.hospital_id == null) continue;
        expect(hospitals.get(Number(row.hospital_id))).toBe(Number(row.organization_id));
      }
    }
  });

  it('matches unique ledgers and line-item entries to the JSON seed', () => {
    compareTable('ledgers', 'ledgers', ['ledger_id', 'admission_id', 'status', 'created_at', 'dispatched_at', 'organization_id', 'hospital_id']);
    compareTable('ledger_entries', 'ledgerEntries', ['ledger_id', 'entry_id', 'service_id', 'quantity', 'unit_price', 'amount', 'entry_time', 'organization_id', 'hospital_id'], true);
  });

  it('matches payments and receipts with unique transaction references', () => {
    compareTable('payments', 'payments', ['payment_id', 'ledger_id', 'amount_paid', 'payment_mode', 'payment_time', 'organization_id', 'hospital_id']);
    compareTable('receipts', 'receipts', ['receipt_id', 'payment_id', 'ledger_id', 'admission_id', 'patient_id', 'amount', 'payment_mode', 'generated_at', 'organization_id', 'hospital_id']);
    const payments = new Set(dataStore.payments.map((payment) => payment.payment_id));
    const ledgers = new Set(dataStore.ledgers.map((ledger) => ledger.ledger_id));
    expect(dataStore.payments.every((payment) => ledgers.has(payment.ledger_id))).toBe(true);
    expect(dataStore.receipts.every((receipt) => payments.has(receipt.payment_id))).toBe(true);
  });
});
