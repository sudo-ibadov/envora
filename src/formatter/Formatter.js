/**
 * @fileoverview Envora Formatter.
 *
 * Produces canonical, deterministic .envora formatting from an AST.
 * Running the formatter multiple times on the same input always produces
 * identical output.
 *
 * Canonical style:
 *   - 4-space indentation
 *   - One entry per line
 *   - Space between section name and {
 *   - No trailing commas in sections
 *   - Commas in arrays, one element per line for long arrays
 */

import { Lexer } from '../lexer/Lexer.js';
import { Parser } from '../parser/Parser.js';

const INDENT = '    '; // 4 spaces

export class Formatter {
  /**
   * Formats .envora source text into canonical style.
   *
   * @param {string} source - Raw .envora source text
   * @param {string} [file='<input>']
   * @returns {string} - Formatted source text
   */
  format(source, file = '<input>') {
    const lexer = new Lexer(source, file);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens, file);
    const ast = parser.parse();

    return this._printDocument(ast);
  }

  // ─── Document ────────────────────────────────────────────────────────────────

  _printDocument(doc) {
    const parts = [];

    for (let i = 0; i < doc.entries.length; i++) {
      const entry = doc.entries[i];
      parts.push(this._printEntry(entry, 0));

      // Blank line between top-level entries
      if (i < doc.entries.length - 1) {
        parts.push('');
      }
    }

    // Ensure single trailing newline
    return parts.join('\n') + '\n';
  }

  // ─── Entries ─────────────────────────────────────────────────────────────────

  _printEntry(entry, depth) {
    if (entry.type === 'Section') {
      return this._printSection(entry, depth);
    }
    if (entry.type === 'Assignment') {
      return this._printAssignment(entry, depth);
    }
    return '';
  }

  _printSection(section, depth) {
    const indent = INDENT.repeat(depth);
    const lines = [];

    lines.push(`${indent}${section.name} {`);

    for (const entry of section.body) {
      lines.push(this._printEntry(entry, depth + 1));
    }

    lines.push(`${indent}}`);
    return lines.join('\n');
  }

  _printAssignment(assignment, depth) {
    const indent = INDENT.repeat(depth);
    const key = assignment.key;
    const value = this._printValue(assignment.value, depth);

    // Top-level array assignments use = syntax
    if (depth === 0 && assignment.value.type === 'Array') {
      return `${indent}${key} = ${value}`;
    }

    return `${indent}${key}: ${value}`;
  }

  // ─── Values ──────────────────────────────────────────────────────────────────

  _printValue(node, depth) {
    switch (node.type) {
      case 'String':
        return this._printString(node.value);

      case 'Number':
        return String(node.value);

      case 'Boolean':
        return String(node.value);

      case 'Null':
        return 'null';

      case 'Array':
        return this._printArray(node, depth);

      case 'Object':
        return this._printObject(node, depth);

      case 'EnvCall':
        return this._printEnvCall(node, depth);

      case 'RequiredCall':
        return `required("${node.varName}")`;

      case 'SecretCall':
        return `secret(${this._printValue(node.inner, depth)})`;

      default:
        return '';
    }
  }

  _printString(value) {
    // Re-escape special characters
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    return `"${escaped}"`;
  }

  _printArray(node, depth) {
    if (node.elements.length === 0) return '[]';

    const indent = INDENT.repeat(depth + 1);
    const closingIndent = INDENT.repeat(depth);

    const items = node.elements.map(el => `${indent}${this._printValue(el, depth + 1)}`);
    return `[\n${items.join(',\n')}\n${closingIndent}]`;
  }

  _printObject(node, depth) {
    if (node.entries.length === 0) return '{}';

    const lines = ['{'];
    for (const entry of node.entries) {
      lines.push(this._printEntry(entry, depth + 1));
    }
    lines.push(`${INDENT.repeat(depth)}}`);
    return lines.join('\n');
  }

  _printEnvCall(node, depth) {
    const varPart = `"${node.varName}"`;
    if (node.defaultValue !== null) {
      const def = this._printValue(node.defaultValue, depth);
      return `env(${varPart}, ${def})`;
    }
    return `env(${varPart})`;
  }
}
