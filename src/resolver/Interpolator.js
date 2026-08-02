/**
 * @fileoverview Envora Interpolator.
 *
 * Resolves ${KEY.path} references inside string values.
 * Detects and rejects circular references.
 * Operates on an already-resolved config object (post-Resolver).
 */

import { CircularReferenceError, EnvoraError } from '../errors/EnvoraError.js';
import { SecretValue } from '../core/SecretValue.js';

/**
 * Interpolates ${...} references within a resolved config object.
 * Mutates the object in-place and returns it.
 *
 * @param {Record<string, any>} config - The resolved config object
 * @param {string} [file='<input>'] - File name for errors
 * @returns {Record<string, any>}
 */
export function interpolate(config, file = '<input>') {
  const interpolator = new Interpolator(config, file);
  interpolator.run();
  return config;
}

/** Regex to find ${...} references in strings */
const INTERP_RE = /\$\{([^}]+)\}/g;

class Interpolator {
  constructor(config, file) {
    this._config = config;
    this._file = file;
    /** @type {Map<string, string>} flat dot-path → value cache */
    this._cache = new Map();
    /** @type {Set<string>} currently resolving paths (cycle detection) */
    this._resolving = new Set();
  }

  run() {
    this._walkObject(this._config, []);
  }

  /**
   * Recursively walk all string values in the config and interpolate them.
   * @param {any} obj
   * @param {string[]} pathParts
   */
  _walkObject(obj, pathParts) {
    if (obj === null || obj === undefined) return;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === 'string') {
          obj[i] = this._resolveString(obj[i], pathParts.join('.'), [pathParts.join('.')]);
        } else {
          this._walkObject(obj[i], pathParts);
        }
      }
      return;
    }

    if (typeof obj === 'object' && !(obj instanceof SecretValue)) {
      for (const key of Object.keys(obj)) {
        const childPath = [...pathParts, key];
        const val = obj[key];

        if (typeof val === 'string') {
          obj[key] = this._resolveString(val, childPath.join('.'), [childPath.join('.')]);
        } else if (val instanceof SecretValue) {
          // Interpolate inside secret values too
          if (typeof val.value === 'string') {
            val._value = this._resolveString(val.value, childPath.join('.'), [childPath.join('.')]);
          }
        } else {
          this._walkObject(val, childPath);
        }
      }
    }
  }

  /**
   * Interpolates ${...} references within a single string.
   * @param {string} str - The string value to interpolate
   * @param {string} currentPath - Dot-path of the owning key (for cycle detection)
   * @param {string[]} [chain] - Visiting stack passed through recursive calls
   * @returns {string}
   */
  _resolveString(str, currentPath, chain = [currentPath]) {
    if (!str.includes('${')) return str;

    return str.replace(INTERP_RE, (match, refPath) => {
      const trimmed = refPath.trim();
      return String(this._resolveRef(trimmed, currentPath, chain));
    });
  }

  /**
   * Looks up a dot-path reference in the config.
   * @param {string} refPath - The referenced path, e.g. "SERVER.host"
   * @param {string} currentPath - The path of the value doing the referencing
   * @param {string[]} chain - Stack of paths for circular reference detection
   * @returns {any}
   */
  _resolveRef(refPath, currentPath, chain) {
    if (chain.includes(refPath)) {
      throw new CircularReferenceError([...chain, refPath], {
        file: this._file,
      });
    }

    const value = this._getByPath(refPath);

    if (value === undefined) {
      throw new EnvoraError(
        `Interpolation error: "${refPath}" is not defined in config`,
        { file: this._file }
      );
    }

    // If the referenced value is itself a string with interpolation, resolve it too
    if (typeof value === 'string' && value.includes('${')) {
      return this._resolveString(value, refPath, [...chain, refPath]);
    }

    if (value instanceof SecretValue) {
      return value.value;
    }

    return value;
  }

  /**
   * Gets a value from the config by dot-path.
   * @param {string} dotPath - e.g. "SERVER.host" or "APP.name"
   * @returns {any}
   */
  _getByPath(dotPath) {
    const parts = dotPath.split('.');
    let current = this._config;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }
}
