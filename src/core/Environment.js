/**
 * @fileoverview Environment — wraps process.env access.
 *
 * Centralizes environment variable lookups so they can be
 * replaced in tests or overridden for multi-env scenarios.
 */

/**
 * Provides access to environment variables.
 * Can be constructed with a custom env map for testing.
 */
export class Environment {
  /**
   * @param {Record<string, string>} [source] - Defaults to process.env
   */
  constructor(source = process.env) {
    this._source = source;
  }

  /**
   * Gets the value of an environment variable.
   * Returns undefined if not set.
   * @param {string} name
   * @returns {string|undefined}
   */
  get(name) {
    return this._source[name];
  }

  /**
   * Returns true if the variable is defined (even if empty string).
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return name in this._source;
  }

  /**
   * Returns all environment variables as a plain object.
   * @returns {Record<string, string>}
   */
  toObject() {
    return { ...this._source };
  }
}
