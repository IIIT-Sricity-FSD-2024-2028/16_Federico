'use strict';

const validator = require('validator');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Hand-rolled stand-in for class-validator + Nest's global ValidationPipe
 * (`new ValidationPipe({ transform: true })`, no `whitelist`). Behavior was
 * verified empirically against the running NestJS backend rather than
 * assumed from source, notably:
 *  - unknown/extra body fields are NOT stripped (no whitelist option), so
 *    this engine only ever *checks*, it never filters req.body.
 *  - numeric-looking strings are NOT coerced ("5" fails @IsInt) because
 *    `transform: true` alone (no class-transformer @Type()/implicit
 *    conversion) doesn't coerce primitives — JSON bodies already arrive
 *    with correct native types for the fields that matter here.
 *  - a field with multiple stacked decorators reports failures in the
 *    REVERSE of their textual top-to-bottom order in the original DTOs
 *    (confirmed by probing e.g. CreateDoctorDto's `specialization` field,
 *    which is `@IsString() @IsNotEmpty()` in source but reports
 *    "should not be empty" before "must be a string"). Each rule's
 *    `checks` array below is already written in that verified order.
 *  - cross-field order in the message array follows DTO property
 *    declaration order top-to-bottom.
 */

const CHECKS = {
  isNotEmpty: (v) => v !== '' && v !== null && v !== undefined,
  isString: (v) => typeof v === 'string',
  isInt: (v) => typeof v === 'number' && Number.isInteger(v),
  isNumber: (v) => typeof v === 'number' && Number.isFinite(v),
  isBoolean: (v) => typeof v === 'boolean',
  isEmail: (v) => typeof v === 'string' && validator.isEmail(v),
  isISO8601: (v) => typeof v === 'string' && validator.isISO8601(v),
  isPhoneNumber: (v) => {
    if (typeof v !== 'string') return false;
    try {
      const parsed = parsePhoneNumberFromString(v);
      return !!parsed && parsed.isValid();
    } catch {
      return false;
    }
  },
};

const MESSAGES = {
  isNotEmpty: (field) => `${field} should not be empty`,
  isString: (field) => `${field} must be a string`,
  isInt: (field) => `${field} must be an integer number`,
  isNumber: (field) => `${field} must be a number conforming to the specified constraints`,
  isBoolean: (field) => `${field} must be a boolean value`,
  isEmail: (field) => `${field} must be an email`,
  isISO8601: (field) => `${field} must be a valid ISO 8601 date string`,
  isPhoneNumber: (field) => `${field} must be a valid phone number`,
};

/**
 * Validates req.body against an ordered list of field rules:
 *   { field: string, checks: string[], optional?: boolean }
 * Mirrors Nest's default ValidationPipe exceptionFactory output shape:
 *   { statusCode: 400, message: string[], error: 'Bad Request' }
 */
function validateBody(rules) {
  return function validate(req, res, next) {
    const body = req.body || {};
    const messages = [];

    for (const rule of rules) {
      const value = body[rule.field];
      if (rule.optional && (value === undefined || value === null)) continue;
      for (const check of rule.checks) {
        if (!CHECKS[check](value)) {
          messages.push(MESSAGES[check](rule.field));
        }
      }
    }

    if (messages.length > 0) {
      return res.status(400).json({
        message: messages,
        error: 'Bad Request',
        statusCode: 400,
      });
    }

    next();
  };
}

/** Equivalent of Nest's PartialType(): every field becomes optional. */
function partial(rules) {
  return rules.map((rule) => ({ ...rule, optional: true }));
}

module.exports = { validateBody, partial, CHECKS, MESSAGES };
