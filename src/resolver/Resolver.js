/**
 * @fileoverview Envora Resolver.
 *
 * Walks the AST and produces a plain JavaScript object (the resolved config).
 * Handles:
 *   - env() / required() calls against process.env
 *   - secret() wrapping
 *   - Nested sections → nested objects
 *   - Type coercion for literals
 */

import {
  MissingEnvError,
} from '../errors/EnvoraError.js';
import { SecretValue } from '../core/SecretValue.js';

/**
 * Resolves an AST DocumentNode into a plain config object.
 */
export class Resolver {
  /**
   * @param {import('../parser/AST.js').DocumentNode} ast
   * @param {object} [options]
   * @param {Record<string,string>} [options.env] - Environment variables (defaults to process.env)
   * @param {string} [options.file] - File name for error context
   */
  constructor(ast, { env = process.env, file = '<input>' } = {}) {
    this._ast = ast;
    this._env = env;
    this._file = file;
  }

  /**
   * Resolves the full document and returns a plain object.
   * @returns {Record<string, any>}
   */
  resolve() {
    return this._resolveDocument(this._ast);
  }

  // ─── Document ────────────────────────────────────────────────────────────────

  _resolveDocument(doc) {
    const result = {};
    for (const entry of doc.entries) {
      this._applyEntry(result, entry);
    }
    return result;
  }

  // ─── Entries ─────────────────────────────────────────────────────────────────

  _applyEntry(target, entry) {
    if (entry.type === 'Section') {
      target[entry.name] = this._resolveSection(entry);
    } else if (entry.type === 'Assignment') {
      target[entry.key] = this._resolveValue(entry.value);
    }
  }

  _resolveSection(section) {
    const obj = {};
    for (const entry of section.body) {
      this._applyEntry(obj, entry);
    }
    return obj;
  }

  // ─── Values ──────────────────────────────────────────────────────────────────

  /**
   * Resolves an AST value node to a JavaScript value.
   * @param {import('../parser/AST.js').ASTValueNode} node
   * @returns {any}
   */
  _resolveValue(node) {
    switch (node.type) {
      case 'String':
        return node.value; // interpolation happens in Interpolator later

      case 'Number':
        return node.value;

      case 'Boolean':
        return node.value;

      case 'Null':
        return null;

      case 'Array':
        return node.elements.map(el => this._resolveValue(el));

      case 'Object': {
        const obj = {};
        for (const entry of node.entries) {
          this._applyEntry(obj, entry);
        }
        return obj;
      }

      case 'EnvCall':
        return this._resolveEnv(node);

      case 'RequiredCall':
        return this._resolveRequired(node);

      case 'SecretCall':
        return this._resolveSecret(node);

      default:
        throw new Error(`Resolver: unknown AST node type '${node.type}'`);
    }
  }

  // ─── env() ───────────────────────────────────────────────────────────────────

  _resolveEnv(node) {
    const raw = this._env[node.varName];

    if (raw !== undefined) {
      return raw;
    }

    if (node.defaultValue !== null) {
      return this._resolveValue(node.defaultValue);
    }

    throw new MissingEnvError(node.varName, {
      file: this._file,
      line: node.line,
      column: node.column,
    });
  }

  // ─── required() ──────────────────────────────────────────────────────────────

  _resolveRequired(node) {
    const raw = this._env[node.varName];

    if (raw !== undefined && raw !== '') {
      return raw;
    }

    throw new MissingEnvError(node.varName, {
      file: this._file,
      line: node.line,
      column: node.column,
    });
  }

  // ─── secret() ────────────────────────────────────────────────────────────────

  _resolveSecret(node) {
    const inner = this._resolveValue(node.inner);
    return new SecretValue(inner);
  }
}
