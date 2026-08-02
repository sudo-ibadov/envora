/**
 * @fileoverview Envora error classes.
 * All errors are structured and never expose secret values.
 */

/**
 * Base error class for all Envora errors.
 * Provides structured location information and safe messaging.
 */
export class EnvoraError extends Error {
  /**
   * @param {string} message - Human-readable error message (must NOT contain secret values)
   * @param {object} [options]
   * @param {string} [options.file] - Source file name
   * @param {number} [options.line] - Line number (1-based)
   * @param {number} [options.column] - Column number (1-based)
   * @param {string} [options.source] - Source excerpt (must NOT contain secret values)
   */
  constructor(message, { file, line, column, source } = {}) {
    super(message);
    this.name = 'EnvoraError';
    this.file = file ?? null;
    this.line = line ?? null;
    this.column = column ?? null;
    this.source = source ?? null;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }

  /**
   * Returns a formatted multi-line error string suitable for CLI output.
   * @returns {string}
   */
  format() {
    const lines = [`${this.name}: ${this.message}`];

    if (this.file) lines.push(`  File:   ${this.file}`);
    if (this.line != null) lines.push(`  Line:   ${this.line}`);
    if (this.column != null) lines.push(`  Column: ${this.column}`);

    if (this.source && this.column != null) {
      lines.push('');
      lines.push(`  ${this.source}`);
      lines.push(`  ${' '.repeat(this.column - 1)}^`);
    }

    return lines.join('\n');
  }
}

/**
 * Raised when the lexer or parser encounters invalid syntax.
 */
export class ParseError extends EnvoraError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.file]
   * @param {number} [options.line]
   * @param {number} [options.column]
   * @param {string} [options.source]
   * @param {string} [options.expected]
   * @param {string} [options.received]
   */
  constructor(message, { file, line, column, source, expected, received } = {}) {
    super(message, { file, line, column, source });
    this.name = 'ParseError';
    this.expected = expected ?? null;
    this.received = received ?? null;
  }
}

/**
 * Raised when a required environment variable is missing.
 * NEVER includes the variable value in the message.
 */
export class MissingEnvError extends EnvoraError {
  /**
   * @param {string} varName - Environment variable name (safe to display)
   * @param {object} [options]
   * @param {string} [options.file]
   * @param {number} [options.line]
   * @param {number} [options.column]
   */
  constructor(varName, { file, line, column } = {}) {
    super(
      `Required environment variable "${varName}" is not set`,
      { file, line, column }
    );
    this.name = 'MissingEnvError';
    this.varName = varName;
  }
}

/**
 * Raised when a circular variable reference is detected during interpolation.
 */
export class CircularReferenceError extends EnvoraError {
  /**
   * @param {string[]} chain - The reference chain that caused the cycle
   * @param {object} [options]
   */
  constructor(chain, options = {}) {
    super(
      `Circular reference detected: ${chain.join(' → ')}`,
      options
    );
    this.name = 'CircularReferenceError';
    this.chain = chain;
  }
}

/**
 * Raised when a config key is required but not found.
 */
export class MissingKeyError extends EnvoraError {
  /**
   * @param {string} key - The config key that was missing
   * @param {object} [options]
   */
  constructor(key, options = {}) {
    super(`Required configuration key "${key}" is not set`, options);
    this.name = 'MissingKeyError';
    this.key = key;
  }
}

/**
 * Raised when validation of a configuration value fails.
 */
export class ValidationError extends EnvoraError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.key] - The key that failed validation
   * @param {string} [options.rule] - The rule that was violated
   */
  constructor(message, { key, rule, ...rest } = {}) {
    super(message, rest);
    this.name = 'ValidationError';
    this.key = key ?? null;
    this.rule = rule ?? null;
  }
}

/**
 * Raised when a file cannot be read or does not exist.
 */
export class LoadError extends EnvoraError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.file]
   * @param {Error} [options.cause]
   */
  constructor(message, { file, cause, ...rest } = {}) {
    super(message, { file, ...rest });
    this.name = 'LoadError';
    if (cause) this.cause = cause;
  }
}
