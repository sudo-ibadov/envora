/**
 * @fileoverview SecretValue — a wrapper for sensitive configuration values.
 *
 * A SecretValue behaves like a normal value when accessed by the application,
 * but is masked in all string representations to prevent accidental exposure
 * in logs, error messages, and debug output.
 */

const MASK = '********';

/**
 * Wraps a sensitive value so it cannot be accidentally logged or serialized.
 *
 * @example
 * const s = new SecretValue('my-super-secret');
 * s.value        // → 'my-super-secret'  (actual value for use in app)
 * String(s)      // → '********'         (masked)
 * JSON.stringify({ password: s }) // → '{"password":"********"}'
 */
export class SecretValue {
  /**
   * @param {any} value - The actual secret value
   */
  constructor(value) {
    // Store value in a non-enumerable property so JSON.stringify
    // doesn't accidentally expose it — we override toJSON() to mask it.
    Object.defineProperty(this, '_value', {
      value,
      writable: true,
      enumerable: false,
      configurable: true,
    });
  }

  /**
   * Returns the actual (unmasked) value for use in application code.
   * @returns {any}
   */
  get value() {
    return this._value;
  }

  /**
   * Returns the masked representation.
   * Called by String(), template literals, and console.log.
   * @returns {string}
   */
  toString() {
    return MASK;
  }

  /**
   * Returns the masked representation for JSON serialization.
   * This prevents accidental leakage via JSON.stringify.
   * @returns {string}
   */
  toJSON() {
    return MASK;
  }

  /**
   * Node.js util.inspect support — masks the value in console.log output.
   * @returns {string}
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return `SecretValue(${MASK})`;
  }

  /**
   * Returns the type of the underlying value.
   * @returns {string}
   */
  get type() {
    return typeof this._value;
  }

  /**
   * Returns true — callers can check if a value is a SecretValue.
   * @returns {boolean}
   */
  get isSecret() {
    return true;
  }
}
