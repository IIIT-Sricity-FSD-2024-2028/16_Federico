'use strict';

/**
 * Single source of truth for the fixed actor-role table. Previously
 * hardcoded independently in both auth.service.js and rbac.service.js
 * (the latter with a comment admitting it was "replicated") — any change
 * to the role table (like adding Admin below) used to require remembering
 * to edit both.
 */
const ROLE_ID_TO_NAME = {
  1: 'HOM',
  2: 'Patient',
  3: 'FA',
  4: 'PRE',
  5: 'Admin',
};

const ROLE_NAME_TO_ID = Object.fromEntries(
  Object.entries(ROLE_ID_TO_NAME).map(([id, name]) => [name, Number(id)]),
);

module.exports = { ROLE_ID_TO_NAME, ROLE_NAME_TO_ID };
