/**
 * @fileoverview Envora — main entry point for the configuration system.
 *
 * Usage:
 *   import { Envora } from 'envora';
 *
 *   const config = await Envora.load('./config.envora');
 *   console.log(config.get('APP.name'));
 */

import path from 'node:path';
import { EnvoraLoader } from '../loaders/EnvoraLoader.js';
import { DotenvLoader } from '../loaders/DotenvLoader.js';
import { Context } from './Context.js';

/**
 * Main Envora API — static factory for loading configurations.
 */
export class Envora {
  /**
   * Loads a configuration file.
   *
   * Automatically detects the file format:
   *   - .envora → full Envora format
   *   - .env    → traditional dotenv format
   *
   * @param {string} filePath - Path to the config file
   * @param {object} [options]
   * @param {Record<string,string>} [options.env] - Override env vars (defaults to process.env)
   * @returns {Promise<import('./Context.js').Context>}
   *
   * @example
   * const config = await Envora.load('./config.envora');
   * console.log(config.get('SERVER.port')); // 3000
   */
  static async load(filePath, options = {}) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.env' || path.basename(filePath).startsWith('.env')) {
      const loader = new DotenvLoader();
      return loader.load(filePath);
    }

    const loader = new EnvoraLoader();
    return loader.load(filePath, options);
  }

  /**
   * Parses .envora or .env source text without file I/O.
   *
   * @param {string} source - Raw source text
   * @param {object} [options]
   * @param {string} [options.format] - 'envora' | 'dotenv' (auto-detected if omitted)
   * @param {string} [options.file] - File name for error messages
   * @param {Record<string,string>} [options.env]
   * @returns {import('./Context.js').Context}
   */
  static parse(source, { format = 'envora', file = '<input>', env = process.env } = {}) {
    if (format === 'dotenv') {
      const loader = new DotenvLoader();
      return loader.parse(source, { file });
    }

    const loader = new EnvoraLoader();
    return loader.parse(source, { file, env });
  }

  /**
   * Creates a Context from a plain object.
   * Useful for testing or programmatic config construction.
   *
   * @param {Record<string, any>} obj
   * @returns {Context}
   */
  static fromObject(obj) {
    return new Context(obj, '<object>');
  }
}
