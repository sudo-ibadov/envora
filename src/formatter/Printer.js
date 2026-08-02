/**
 * @fileoverview Printer — formats and writes .envora files.
 *
 * Higher-level wrapper around Formatter that handles file I/O
 * and --check mode.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { Formatter } from './Formatter.js';

export class Printer {
  constructor() {
    this._formatter = new Formatter();
  }

  /**
   * Formats a file in-place.
   *
   * @param {string} filePath
   * @returns {Promise<{changed: boolean}>}
   */
  async formatFile(filePath) {
    const source = await readFile(filePath, 'utf8');
    const formatted = this._formatter.format(source, filePath);

    if (source === formatted) {
      return { changed: false };
    }

    await writeFile(filePath, formatted, 'utf8');
    return { changed: true };
  }

  /**
   * Checks whether a file is already formatted (--check mode).
   *
   * @param {string} filePath
   * @returns {Promise<boolean>} true if already formatted
   */
  async checkFile(filePath) {
    const source = await readFile(filePath, 'utf8');
    const formatted = this._formatter.format(source, filePath);
    return source === formatted;
  }

  /**
   * Formats source text directly (no I/O).
   *
   * @param {string} source
   * @param {string} [file]
   * @returns {string}
   */
  formatSource(source, file = '<input>') {
    return this._formatter.format(source, file);
  }
}
