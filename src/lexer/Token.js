/**
 * @fileoverview Token types and Token class for the Envora lexer.
 */

/**
 * All token types produced by the Envora lexer.
 * @enum {string}
 */
export const TokenType = Object.freeze({
  // Literals
  STRING: 'STRING',           // "hello"
  NUMBER: 'NUMBER',           // 42, 3.14, -1
  BOOLEAN: 'BOOLEAN',         // true, false
  NULL: 'NULL',               // null

  // Identifiers
  IDENTIFIER: 'IDENTIFIER',   // APP, name, host

  // Structure
  LBRACE: 'LBRACE',           // {
  RBRACE: 'RBRACE',           // }
  LBRACKET: 'LBRACKET',       // [
  RBRACKET: 'RBRACKET',       // ]
  COLON: 'COLON',             // :
  COMMA: 'COMMA',             // ,
  EQUALS: 'EQUALS',           // =

  // Env/secret builtins
  ENV: 'ENV',                 // env(...)
  REQUIRED: 'REQUIRED',       // required(...)
  SECRET: 'SECRET',           // secret(...)

  // Punctuation for builtin calls
  LPAREN: 'LPAREN',           // (
  RPAREN: 'RPAREN',           // )

  // Whitespace / structural
  NEWLINE: 'NEWLINE',         // \n
  EOF: 'EOF',                 // end of input
  COMMENT: 'COMMENT',         // # comment
});

/**
 * A single token produced by the Lexer.
 */
export class Token {
  /**
   * @param {string} type - One of TokenType
   * @param {*} value - The resolved value of the token
   * @param {string} raw - The raw source text for this token
   * @param {number} line - 1-based line number
   * @param {number} column - 1-based column number
   */
  constructor(type, value, raw, line, column) {
    this.type = type;
    this.value = value;
    this.raw = raw;
    this.line = line;
    this.column = column;
  }

  /**
   * Returns a human-readable description (never exposes secret values).
   * @returns {string}
   */
  toString() {
    // Never expose potential secret values in representations
    const safeValue =
      this.type === TokenType.STRING
        ? `"${this.raw}"`
        : String(this.raw);
    return `Token(${this.type}, ${safeValue}, ${this.line}:${this.column})`;
  }
}
