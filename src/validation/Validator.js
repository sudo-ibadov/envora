/**
 * @fileoverview Envora Validator.
 *
 * Validates a resolved Context against a user-supplied schema.
 * Collects all errors before throwing, providing a complete picture.
 */

import { ValidationError } from '../errors/EnvoraError.js';

/**
 * @typedef {Object} FieldRule
 * @property {'string'|'number'|'boolean'|'array'|'object'} [type]
 * @property {boolean} [required]
 * @property {number} [min] - For numbers: minimum value. For strings: minimum length.
 * @property {number} [max] - For numbers: maximum value. For strings: maximum length.
 * @property {string[]} [enum] - Allowed values
 * @property {RegExp|string} [pattern] - String pattern
 */

/**
 * @typedef {Record<string, FieldRule>} ValidationSchema
 */

export class Validator {
  /**
   * @param {import('../core/Context.js').Context} context
   * @param {string} [file]
   */
  constructor(context, file = '<input>') {
    this._context = context;
    this._file = file;
  }

  /**
   * Validates the context against the schema.
   * Throws a single ValidationError listing all failures.
   *
   * @param {ValidationSchema} schema
   * @throws {ValidationError}
   */
  validate(schema) {
    const errors = [];

    for (const [path, rule] of Object.entries(schema)) {
      const fieldErrors = this._validateField(path, rule);
      errors.push(...fieldErrors);
    }

    if (errors.length > 0) {
      const messages = errors.map(e => `  • ${e}`).join('\n');
      throw new ValidationError(
        `Configuration validation failed:\n${messages}`,
        { file: this._file }
      );
    }
  }

  /**
   * Validates a single field against its rule.
   * Returns an array of human-readable error strings.
   * @param {string} path
   * @param {FieldRule} rule
   * @returns {string[]}
   */
  _validateField(path, rule) {
    const errors = [];
    const value = this._context.get(path);
    const exists = this._context.has(path) && value !== null && value !== undefined;

    // Required check
    if (rule.required && !exists) {
      errors.push(`"${path}" is required but not set`);
      return errors; // Further checks won't apply if missing
    }

    if (!exists) return errors; // Optional and missing — OK

    // Type check
    if (rule.type) {
      const typeError = this._checkType(path, value, rule.type);
      if (typeError) {
        errors.push(typeError);
        return errors; // Skip range checks if type is wrong
      }
    }

    // Min / max for numbers
    if (rule.type === 'number' || typeof value === 'number') {
      const num = Number(value);
      if (rule.min !== undefined && num < rule.min) {
        errors.push(`"${path}" must be >= ${rule.min}, got ${num}`);
      }
      if (rule.max !== undefined && num > rule.max) {
        errors.push(`"${path}" must be <= ${rule.max}, got ${num}`);
      }
    }

    // Min / max for strings (length)
    if (rule.type === 'string' || typeof value === 'string') {
      const str = String(value);
      if (rule.min !== undefined && str.length < rule.min) {
        errors.push(`"${path}" length must be >= ${rule.min}, got ${str.length}`);
      }
      if (rule.max !== undefined && str.length > rule.max) {
        errors.push(`"${path}" length must be <= ${rule.max}, got ${str.length}`);
      }
    }

    // Enum check
    if (rule.enum) {
      const strVal = String(value);
      if (!rule.enum.includes(strVal)) {
        errors.push(
          `"${path}" must be one of [${rule.enum.map(v => `"${v}"`).join(', ')}], got "${strVal}"`
        );
      }
    }

    // Pattern check
    if (rule.pattern) {
      const re = typeof rule.pattern === 'string'
        ? new RegExp(rule.pattern)
        : rule.pattern;
      if (!re.test(String(value))) {
        errors.push(`"${path}" does not match required pattern ${re}`);
      }
    }

    return errors;
  }

  _checkType(path, value, expectedType) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;

    // Allow string coercion for numbers coming from env vars
    if (expectedType === 'number') {
      const n = Number(value);
      if (isNaN(n)) {
        return `"${path}" must be of type number, got "${value}"`;
      }
      return null;
    }

    if (expectedType === 'boolean') {
      if (value !== true && value !== false && value !== 'true' && value !== 'false') {
        return `"${path}" must be of type boolean, got "${value}"`;
      }
      return null;
    }

    if (actualType !== expectedType) {
      return `"${path}" must be of type ${expectedType}, got ${actualType}`;
    }

    return null;
  }
}
