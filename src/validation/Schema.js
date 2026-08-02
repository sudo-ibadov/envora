/**
 * @fileoverview Schema builder helpers.
 *
 * Provides convenience factory functions for building validation schemas.
 *
 * @example
 * import { Schema } from 'envora';
 *
 * config.validate({
 *   'SERVER.port': Schema.number({ required: true, min: 1, max: 65535 }),
 *   'APP.name': Schema.string({ required: true }),
 *   'APP.environment': Schema.string({ enum: ['development', 'staging', 'production'] }),
 * });
 */

export const Schema = {
  /**
   * @param {object} [options]
   * @returns {import('./Validator.js').FieldRule}
   */
  string(options = {}) {
    return { type: 'string', ...options };
  },

  /**
   * @param {object} [options]
   * @returns {import('./Validator.js').FieldRule}
   */
  number(options = {}) {
    return { type: 'number', ...options };
  },

  /**
   * @param {object} [options]
   * @returns {import('./Validator.js').FieldRule}
   */
  boolean(options = {}) {
    return { type: 'boolean', ...options };
  },

  /**
   * @param {object} [options]
   * @returns {import('./Validator.js').FieldRule}
   */
  array(options = {}) {
    return { type: 'array', ...options };
  },

  /**
   * @param {object} [options]
   * @returns {import('./Validator.js').FieldRule}
   */
  object(options = {}) {
    return { type: 'object', ...options };
  },

  /**
   * A required field of any type.
   * @param {object} [options]
   * @returns {import('./Validator.js').FieldRule}
   */
  required(options = {}) {
    return { required: true, ...options };
  },
};
