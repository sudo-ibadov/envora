/**
 * @fileoverview EnvoraLoader — loads and processes .envora files.
 *
 * Pipeline:
 *   source text → Lexer → tokens → Parser → AST → Resolver → config → Interpolator → Context
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Lexer } from '../lexer/Lexer.js';
import { Parser } from '../parser/Parser.js';
import { Resolver } from '../resolver/Resolver.js';
import { interpolate } from '../resolver/Interpolator.js';
import { Context } from '../core/Context.js';
import { LoadError } from '../errors/EnvoraError.js';

export class EnvoraLoader {
  /**
   * Loads a .envora file from disk.
   *
   * @param {string} filePath - Path to the .envora file
   * @param {object} [options]
   * @param {Record<string,string>} [options.env] - Override env vars (defaults to process.env)
   * @returns {Promise<Context>}
   */
  async load(filePath, { env = process.env } = {}) {
    const resolved = path.resolve(filePath);
    let source;

    try {
      source = await readFile(resolved, 'utf8');
    } catch (err) {
      throw new LoadError(
        `Cannot read file: ${resolved}`,
        { file: resolved, cause: err }
      );
    }

    return this.parse(source, { file: resolved, env });
  }

  /**
   * Parses .envora source text into a Context (no file I/O).
   *
   * @param {string} source - Raw .envora source text
   * @param {object} [options]
   * @param {string} [options.file] - File name for error context
   * @param {Record<string,string>} [options.env]
   * @returns {Context}
   */
  parse(source, { file = '<input>', env = process.env } = {}) {
    // 1. Lex
    const lexer = new Lexer(source, file);
    const tokens = lexer.tokenize();

    // 2. Parse
    const parser = new Parser(tokens, file);
    const ast = parser.parse();

    // 3. Resolve (env calls, etc.)
    const resolver = new Resolver(ast, { env, file });
    const config = resolver.resolve();

    // 4. Interpolate (${...} references)
    interpolate(config, file);

    return new Context(config, file);
  }
}
