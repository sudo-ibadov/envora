/**
 * @fileoverview Context — the resolved configuration container.
 *
 * Wraps the resolved config object and provides:
 *   - get(path) / has(path)
 *   - getString / getNumber / getBoolean typed accessors
 *   - require(path) — throws if missing
 *   - validate(schema) — validates against a schema
 *   - Masking of SecretValues in serialization
 */

import { MissingKeyError, ValidationError } from '../errors/EnvoraError.js';
import { SecretValue } from './SecretValue.js';
import { Validator } from '../validation/Validator.js';

export class Context {
  /**
   * @param {Record<string, any>} config - The resolved and interpolated config
   * @param {string} [file='<input>'] - Source file for error messages
   */
  constructor(config, file = '<input>') {
    this._config = config;
    this._file = file;
  }

  // ─── Core accessors ──────────────────────────────────────────────────────────

  /**
   * Gets a value by dot-path. Returns undefined if not found.
   * For SecretValues, returns the actual underlying value.
   *
   * @param {string} path - Dot-separated path, e.g. "SERVER.port"
   * @param {any} [fallback] - Default value if path is not set
   * @returns {any}
   */
  get(path, fallback = undefined) {
    const raw = this._getByPath(path);

    if (raw === undefined) return fallback;

    // Unwrap SecretValue transparently for application use
    if (raw instanceof SecretValue) return raw.value;

    return raw;
  }

  /**
   * Returns true if the path exists in the config.
   * @param {string} path
   * @returns {boolean}
   */
  has(path) {
    return this._getByPath(path) !== undefined;
  }

  /**
   * Gets a value and throws MissingKeyError if not found.
   * @param {string} path
   * @returns {any}
   */
  require(path) {
    const value = this.get(path);
    if (value === undefined || value === null) {
      throw new MissingKeyError(path, { file: this._file });
    }
    return value;
  }

  // ─── Typed accessors ─────────────────────────────────────────────────────────

  /**
   * Gets a string value. Coerces numbers and booleans to string.
   * @param {string} path
   * @param {string} [fallback]
   * @returns {string|undefined}
   */
  getString(path, fallback = undefined) {
    const val = this.get(path);
    if (val === undefined || val === null) return fallback;
    return String(val);
  }

  /**
   * Gets a numeric value. Coerces string representations of numbers.
   * Returns undefined if not a valid number.
   * @param {string} path
   * @param {number} [fallback]
   * @returns {number|undefined}
   */
  getNumber(path, fallback = undefined) {
    const val = this.get(path);
    if (val === undefined || val === null) return fallback;
    const n = Number(val);
    if (isNaN(n)) return fallback;
    return n;
  }

  /**
   * Gets a boolean value. Coerces "true"/"false" strings.
   * @param {string} path
   * @param {boolean} [fallback]
   * @returns {boolean|undefined}
   */
  getBoolean(path, fallback = undefined) {
    const val = this.get(path);
    if (val === undefined || val === null) return fallback;
    if (typeof val === 'boolean') return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return fallback;
  }

  /**
   * Gets an array value.
   * @param {string} path
   * @param {any[]} [fallback]
   * @returns {any[]|undefined}
   */
  getArray(path, fallback = undefined) {
    const val = this.get(path);
    if (val === undefined || val === null) return fallback;
    if (Array.isArray(val)) return val;
    return fallback;
  }

  /**
   * Gets an object/section value.
   * @param {string} path
   * @returns {Record<string,any>|undefined}
   */
  getObject(path) {
    const val = this.get(path);
    if (val === null || val === undefined) return undefined;
    if (typeof val === 'object' && !Array.isArray(val)) return val;
    return undefined;
  }

  // ─── Validation ──────────────────────────────────────────────────────────────

  /**
   * Validates the config against a schema.
   * Throws ValidationError with all failures listed.
   *
   * @param {import('../validation/Validator.js').ValidationSchema} schema
   * @throws {ValidationError}
   */
  validate(schema) {
    const validator = new Validator(this, this._file);
    validator.validate(schema);
  }

  // ─── Serialization ───────────────────────────────────────────────────────────

  /**
   * Returns a plain object with secret values masked.
   * Safe for logging and debug output.
   * @returns {Record<string, any>}
   */
  toSafeObject() {
    return maskSecrets(this._config);
  }

  /**
   * Returns the raw config object (SecretValues not unwrapped).
   * @returns {Record<string, any>}
   */
  toRawObject() {
    return this._config;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  _getByPath(path) {
    const parts = path.split('.');
    let current = this._config;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object' || Array.isArray(current)) return undefined;
      current = current[part];
    }

    return current;
  }
}

/**
 * Recursively masks all SecretValue instances in an object for safe display.
 * @param {any} obj
 * @returns {any}
 */
function maskSecrets(obj) {
  if (obj instanceof SecretValue) {
    return '********';
  }

  if (Array.isArray(obj)) {
    return obj.map(maskSecrets);
  }

  if (obj !== null && typeof obj === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = maskSecrets(val);
    }
    return result;
  }

  return obj;
}
