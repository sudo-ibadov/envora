/**
 * @fileoverview Envora Lexer.
 *
 * Converts raw .envora source text into a stream of Tokens.
 * The lexer is character-by-character and does NOT use regex for core parsing.
 */

import { Token, TokenType } from './Token.js';
import { ParseError } from '../errors/EnvoraError.js';

/** Built-in function keywords */
const BUILTINS = new Set(['env', 'required', 'secret']);

/** Boolean keyword values */
const BOOLEAN_KEYWORDS = new Map([
  ['true', true],
  ['false', false],
]);

/**
 * Converts .envora source text into an array of tokens.
 */
export class Lexer {
  /**
   * @param {string} source - The raw source text
   * @param {string} [file='<input>'] - File name for error messages
   */
  constructor(source, file = '<input>') {
    this._source = source;
    this._file = file;
    this._pos = 0;
    this._line = 1;
    this._column = 1;
    this._tokens = [];
  }

  /**
   * Tokenizes the entire source and returns all tokens.
   * @returns {Token[]}
   */
  tokenize() {
    while (!this._atEnd()) {
      this._skipWhitespaceAndComments();
      if (this._atEnd()) break;

      const ch = this._peek();

      if (ch === '\n') {
        this._advance();
        continue; // Newlines are not significant at top level; structural via braces
      }

      if (ch === '{') {
        this._emitSingle(TokenType.LBRACE, '{');
      } else if (ch === '}') {
        this._emitSingle(TokenType.RBRACE, '}');
      } else if (ch === '[') {
        this._emitSingle(TokenType.LBRACKET, '[');
      } else if (ch === ']') {
        this._emitSingle(TokenType.RBRACKET, ']');
      } else if (ch === '(') {
        this._emitSingle(TokenType.LPAREN, '(');
      } else if (ch === ')') {
        this._emitSingle(TokenType.RPAREN, ')');
      } else if (ch === ':') {
        this._emitSingle(TokenType.COLON, ':');
      } else if (ch === ',') {
        this._emitSingle(TokenType.COMMA, ',');
      } else if (ch === '=') {
        this._emitSingle(TokenType.EQUALS, '=');
      } else if (ch === '"') {
        this._readString();
      } else if (ch === '-' || this._isDigit(ch)) {
        this._readNumber();
      } else if (this._isIdentStart(ch)) {
        this._readIdentifierOrKeyword();
      } else {
        this._error(`Unexpected character: '${ch}'`);
      }
    }

    this._tokens.push(
      new Token(TokenType.EOF, null, '', this._line, this._column)
    );

    return this._tokens;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  _peek(offset = 0) {
    return this._source[this._pos + offset];
  }

  _advance() {
    const ch = this._source[this._pos++];
    if (ch === '\n') {
      this._line++;
      this._column = 1;
    } else {
      this._column++;
    }
    return ch;
  }

  _atEnd() {
    return this._pos >= this._source.length;
  }

  _isDigit(ch) {
    return ch >= '0' && ch <= '9';
  }

  _isIdentStart(ch) {
    return (ch >= 'a' && ch <= 'z') ||
           (ch >= 'A' && ch <= 'Z') ||
           ch === '_';
  }

  _isIdentPart(ch) {
    return this._isIdentStart(ch) || this._isDigit(ch);
  }

  /** Skips spaces, tabs, carriage returns, and # comments */
  _skipWhitespaceAndComments() {
    while (!this._atEnd()) {
      const ch = this._peek();
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this._advance();
      } else if (ch === '#') {
        // Skip to end of line
        while (!this._atEnd() && this._peek() !== '\n') {
          this._advance();
        }
      } else {
        break;
      }
    }
  }

  _emitSingle(type, raw) {
    const line = this._line;
    const col = this._column;
    this._advance();
    this._tokens.push(new Token(type, raw, raw, line, col));
  }

  _error(message, line, column) {
    throw new ParseError(message, {
      file: this._file,
      line: line ?? this._line,
      column: column ?? this._column,
    });
  }

  // ─── String lexing ────────────────────────────────────────────────────────────

  /**
   * Reads a double-quoted string, handling escape sequences.
   * Supports: \\ \" \n \r \t \uXXXX
   */
  _readString() {
    const startLine = this._line;
    const startCol = this._column;

    this._advance(); // consume opening "

    let value = '';
    let raw = '';

    while (!this._atEnd()) {
      const ch = this._peek();

      if (ch === '"') {
        this._advance(); // consume closing "
        this._tokens.push(
          new Token(TokenType.STRING, value, raw, startLine, startCol)
        );
        return;
      }

      if (ch === '\n' || ch === '\r') {
        this._error('Unterminated string literal (unexpected newline)', startLine, startCol);
      }

      if (ch === '\\') {
        this._advance(); // consume backslash
        const esc = this._advance();
        raw += '\\' + esc;
        switch (esc) {
          case '"':  value += '"'; break;
          case '\\': value += '\\'; break;
          case 'n':  value += '\n'; break;
          case 'r':  value += '\r'; break;
          case 't':  value += '\t'; break;
          case 'u': {
            // Unicode escape: \uXXXX
            let hex = '';
            for (let i = 0; i < 4; i++) {
              if (this._atEnd()) {
                this._error('Incomplete Unicode escape sequence', startLine, startCol);
              }
              hex += this._advance();
            }
            raw += hex;
            const code = parseInt(hex, 16);
            if (isNaN(code)) {
              this._error(`Invalid Unicode escape sequence: \\u${hex}`, startLine, startCol);
            }
            value += String.fromCharCode(code);
            break;
          }
          default:
            this._error(`Invalid escape sequence: \\${esc}`, startLine, startCol);
        }
      } else {
        raw += ch;
        value += ch;
        this._advance();
      }
    }

    this._error('Unterminated string literal', startLine, startCol);
  }

  // ─── Number lexing ────────────────────────────────────────────────────────────

  _readNumber() {
    const startLine = this._line;
    const startCol = this._column;
    let raw = '';

    if (this._peek() === '-') {
      raw += this._advance();
    }

    while (!this._atEnd() && this._isDigit(this._peek())) {
      raw += this._advance();
    }

    // Decimal part
    if (!this._atEnd() && this._peek() === '.') {
      raw += this._advance();
      if (this._atEnd() || !this._isDigit(this._peek())) {
        this._error('Expected digit after decimal point', startLine, startCol);
      }
      while (!this._atEnd() && this._isDigit(this._peek())) {
        raw += this._advance();
      }
    }

    // Scientific notation
    if (!this._atEnd() && (this._peek() === 'e' || this._peek() === 'E')) {
      raw += this._advance();
      if (!this._atEnd() && (this._peek() === '+' || this._peek() === '-')) {
        raw += this._advance();
      }
      if (this._atEnd() || !this._isDigit(this._peek())) {
        this._error('Expected digit in scientific notation', startLine, startCol);
      }
      while (!this._atEnd() && this._isDigit(this._peek())) {
        raw += this._advance();
      }
    }

    const value = Number(raw);
    if (isNaN(value)) {
      this._error(`Invalid number literal: ${raw}`, startLine, startCol);
    }

    this._tokens.push(new Token(TokenType.NUMBER, value, raw, startLine, startCol));
  }

  // ─── Identifier / keyword lexing ─────────────────────────────────────────────

  _readIdentifierOrKeyword() {
    const startLine = this._line;
    const startCol = this._column;
    let raw = '';

    while (!this._atEnd() && this._isIdentPart(this._peek())) {
      raw += this._advance();
    }

    // Check for boolean keywords
    if (BOOLEAN_KEYWORDS.has(raw)) {
      this._tokens.push(
        new Token(TokenType.BOOLEAN, BOOLEAN_KEYWORDS.get(raw), raw, startLine, startCol)
      );
      return;
    }

    // Check for null
    if (raw === 'null') {
      this._tokens.push(
        new Token(TokenType.NULL, null, raw, startLine, startCol)
      );
      return;
    }

    // Check for builtin function calls: env(...), required(...), secret(...)
    if (BUILTINS.has(raw)) {
      // Skip whitespace before '('
      this._skipWhitespaceAndComments();
      if (!this._atEnd() && this._peek() === '(') {
        // The identifier is a builtin call — emit as its own type
        const builtinType = raw.toUpperCase();
        // We store the function name; the parser handles the argument list
        this._tokens.push(
          new Token(TokenType[builtinType], raw, raw, startLine, startCol)
        );
        return;
      }
    }

    // Plain identifier
    this._tokens.push(
      new Token(TokenType.IDENTIFIER, raw, raw, startLine, startCol)
    );
  }
}
