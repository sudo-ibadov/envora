/**
 * @fileoverview DotenvLoader — loads traditional .env files.
 *
 * Supports:
 *   KEY=value
 *   KEY="quoted value"
 *   KEY='single quoted'
 *   # comments
 *   empty lines
 *   KEY=          (empty value)
 *   Escape sequences in double-quoted values: \n \r \t \\ \"
 *
 * Does NOT use regex as the entire parser — uses a character-by-character
 * approach consistent with the rest of Envora's architecture.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Context } from '../core/Context.js';
import { LoadError, ParseError } from '../errors/EnvoraError.js';

export class DotenvLoader {
  /**
   * Loads a .env file from disk.
   *
   * @param {string} filePath
   * @returns {Promise<Context>}
   */
  async load(filePath) {
    const resolved = path.resolve(filePath);
    let source;

    try {
      source = await readFile(resolved, 'utf8');
    } catch (err) {
      throw new LoadError(`Cannot read file: ${resolved}`, {
        file: resolved,
        cause: err,
      });
    }

    return this.parse(source, { file: resolved });
  }

  /**
   * Parses .env source text into a Context (no file I/O).
   *
   * @param {string} source
   * @param {object} [options]
   * @param {string} [options.file]
   * @returns {Context}
   */
  parse(source, { file = '<input>' } = {}) {
    const config = {};
    const lines = source.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i].trim();

      // Skip empty lines and comments
      if (line === '' || line.startsWith('#')) continue;

      // Must contain '='
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) {
        throw new ParseError(
          `Invalid .env syntax: missing '=' on line ${lineNum}`,
          { file, line: lineNum, column: 1 }
        );
      }

      const key = line.slice(0, eqIdx).trim();
      if (!key) {
        throw new ParseError(
          `Invalid .env syntax: empty key on line ${lineNum}`,
          { file, line: lineNum, column: 1 }
        );
      }

      // Validate key: only alphanumeric and underscore
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
        throw new ParseError(
          `Invalid .env key "${key}" on line ${lineNum}`,
          { file, line: lineNum, column: 1 }
        );
      }

      const rawValue = line.slice(eqIdx + 1).trim();
      config[key] = this._parseValue(rawValue, file, lineNum);
    }

    return new Context(config, file);
  }

  /**
   * Parses a .env value, handling quotes and escape sequences.
   * @param {string} raw
   * @param {string} file
   * @param {number} lineNum
   * @returns {string}
   */
  _parseValue(raw, file, lineNum) {
    if (raw === '') return '';

    // Double-quoted value
    if (raw.startsWith('"')) {
      return this._parseDoubleQuoted(raw, file, lineNum);
    }

    // Single-quoted value (no escape processing)
    if (raw.startsWith("'")) {
      if (!raw.endsWith("'") || raw.length < 2) {
        throw new ParseError(
          `Unterminated single-quoted value on line ${lineNum}`,
          { file, line: lineNum }
        );
      }
      return raw.slice(1, -1);
    }

    // Inline comment stripping: KEY=value # comment → "value"
    const commentIdx = raw.indexOf(' #');
    if (commentIdx !== -1) {
      return raw.slice(0, commentIdx).trim();
    }

    return raw;
  }

  _parseDoubleQuoted(raw, file, lineNum) {
    if (!raw.endsWith('"') || raw.length < 2) {
      throw new ParseError(
        `Unterminated double-quoted value on line ${lineNum}`,
        { file, line: lineNum }
      );
    }

    const inner = raw.slice(1, -1);
    let result = '';
    let i = 0;

    while (i < inner.length) {
      if (inner[i] === '\\' && i + 1 < inner.length) {
        const esc = inner[i + 1];
        switch (esc) {
          case 'n':  result += '\n'; break;
          case 'r':  result += '\r'; break;
          case 't':  result += '\t'; break;
          case '\\': result += '\\'; break;
          case '"':  result += '"'; break;
          case '$':  result += '$'; break;
          default:   result += '\\' + esc;
        }
        i += 2;
      } else {
        result += inner[i];
        i++;
      }
    }

    return result;
  }
}
