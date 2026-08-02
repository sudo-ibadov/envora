/**
 * @fileoverview Envora Parser.
 *
 * Consumes a token stream from the Lexer and produces an AST (DocumentNode).
 * Provides precise error messages with file/line/column context.
 */

import { TokenType } from '../lexer/Token.js'; // includes LPAREN, RPAREN
import { ParseError } from '../errors/EnvoraError.js';
import {
  DocumentNode,
  SectionNode,
  AssignmentNode,
  StringNode,
  NumberNode,
  BooleanNode,
  NullNode,
  ArrayNode,
  ObjectNode,
  EnvCallNode,
  RequiredCallNode,
  SecretCallNode,
} from './AST.js';

export class Parser {
  /**
   * @param {import('../lexer/Token.js').Token[]} tokens
   * @param {string} [file='<input>']
   */
  constructor(tokens, file = '<input>') {
    this._tokens = tokens;
    this._file = file;
    this._pos = 0;
  }

  /**
   * Parse the full token stream into a DocumentNode.
   * @returns {DocumentNode}
   */
  parse() {
    const entries = [];

    while (!this._atEnd()) {
      this._skipNewlines();
      if (this._atEnd()) break;

      const entry = this._parseTopLevelEntry();
      if (entry) entries.push(entry);
    }

    return new DocumentNode(entries);
  }

  // ─── Top-level ────────────────────────────────────────────────────────────────

  /**
   * Parses a top-level entry: either a section (IDENT { }) or an assignment (KEY = value / KEY: value).
   */
  _parseTopLevelEntry() {
    const tok = this._peek();

    if (tok.type === TokenType.EOF) return null;

    if (tok.type !== TokenType.IDENTIFIER) {
      this._error(
        `Expected section name or key, got '${tok.raw}'`,
        tok,
        `Expected identifier`
      );
    }

    const nameTok = this._consume(TokenType.IDENTIFIER);

    this._skipNewlines();
    const next = this._peek();

    // Section: IDENT { ... }
    if (next.type === TokenType.LBRACE) {
      const body = this._parseSectionBody();
      return new SectionNode(nameTok.value, body, nameTok.line, nameTok.column);
    }

    // Assignment with = : KEY = value
    if (next.type === TokenType.EQUALS) {
      this._consume(TokenType.EQUALS);
      this._skipNewlines();
      const value = this._parseValue();
      return new AssignmentNode(nameTok.value, value, nameTok.line, nameTok.column);
    }

    // Assignment with : : key: value (inside sections only, but allow at top level)
    if (next.type === TokenType.COLON) {
      this._consume(TokenType.COLON);
      this._skipNewlines();
      const value = this._parseValue();
      return new AssignmentNode(nameTok.value, value, nameTok.line, nameTok.column);
    }

    this._error(
      `Expected '{', '=', or ':' after '${nameTok.raw}', got '${next.raw}'`,
      next,
      `Expected '{', '=', or ':'`
    );
  }

  // ─── Section body ─────────────────────────────────────────────────────────────

  /**
   * Parses the body of a section: { entry* }
   * @returns {Array<AssignmentNode|SectionNode>}
   */
  _parseSectionBody() {
    this._consume(TokenType.LBRACE);
    const entries = [];

    while (true) {
      this._skipNewlines();
      const tok = this._peek();

      if (tok.type === TokenType.RBRACE) {
        this._consume(TokenType.RBRACE);
        break;
      }

      if (tok.type === TokenType.EOF) {
        this._error('Unterminated section — expected \'}\'', tok);
      }

      entries.push(this._parseSectionEntry());

      // Optional trailing comma or newline separator
      this._skipNewlines();
      if (this._peek().type === TokenType.COMMA) {
        this._advance();
      }
    }

    return entries;
  }

  /**
   * Parses one entry inside a section body.
   * @returns {AssignmentNode|SectionNode}
   */
  _parseSectionEntry() {
    const tok = this._peek();

    if (tok.type !== TokenType.IDENTIFIER) {
      this._error(
        `Expected key or nested section name, got '${tok.raw}'`,
        tok
      );
    }

    const nameTok = this._consume(TokenType.IDENTIFIER);
    this._skipNewlines();
    const next = this._peek();

    // Nested section
    if (next.type === TokenType.LBRACE) {
      const body = this._parseSectionBody();
      return new SectionNode(nameTok.value, body, nameTok.line, nameTok.column);
    }

    // Assignment with :
    if (next.type === TokenType.COLON) {
      this._consume(TokenType.COLON);
      this._skipNewlines();
      const value = this._parseValue();
      return new AssignmentNode(nameTok.value, value, nameTok.line, nameTok.column);
    }

    // Assignment with =
    if (next.type === TokenType.EQUALS) {
      this._consume(TokenType.EQUALS);
      this._skipNewlines();
      const value = this._parseValue();
      return new AssignmentNode(nameTok.value, value, nameTok.line, nameTok.column);
    }

    this._error(
      `Expected '{', ':', or '=' after key '${nameTok.raw}', got '${next.raw}'`,
      next
    );
  }

  // ─── Value parsing ────────────────────────────────────────────────────────────

  /**
   * Parses any value expression.
   * @returns {import('./AST.js').ASTValueNode}
   */
  _parseValue() {
    const tok = this._peek();

    switch (tok.type) {
      case TokenType.STRING:
        return this._parseString();

      case TokenType.NUMBER:
        this._advance();
        return new NumberNode(tok.value, tok.line, tok.column);

      case TokenType.BOOLEAN:
        this._advance();
        return new BooleanNode(tok.value, tok.line, tok.column);

      case TokenType.NULL:
        this._advance();
        return new NullNode(tok.line, tok.column);

      case TokenType.LBRACKET:
        return this._parseArray();

      case TokenType.LBRACE:
        return this._parseInlineObject();

      case TokenType.ENV:
        return this._parseEnvCall();

      case TokenType.REQUIRED:
        return this._parseRequiredCall();

      case TokenType.SECRET:
        return this._parseSecretCall();

      default:
        this._error(
          `Unexpected token '${tok.raw}' — expected a value`,
          tok,
          `Expected string, number, boolean, null, array, object, env(), required(), or secret()`
        );
    }
  }

  _parseString() {
    const tok = this._consume(TokenType.STRING);
    return new StringNode(tok.value, tok.line, tok.column);
  }

  // ─── Array ────────────────────────────────────────────────────────────────────

  _parseArray() {
    const startTok = this._consume(TokenType.LBRACKET);
    const elements = [];

    while (true) {
      this._skipNewlines();
      const tok = this._peek();

      if (tok.type === TokenType.RBRACKET) {
        this._consume(TokenType.RBRACKET);
        break;
      }

      if (tok.type === TokenType.EOF) {
        this._error('Unterminated array — expected \']\'', tok);
      }

      elements.push(this._parseValue());
      this._skipNewlines();

      // Optional comma
      if (this._peek().type === TokenType.COMMA) {
        this._advance();
      }
    }

    return new ArrayNode(elements, startTok.line, startTok.column);
  }

  // ─── Inline object ────────────────────────────────────────────────────────────

  _parseInlineObject() {
    const startTok = this._consume(TokenType.LBRACE);
    const entries = [];

    while (true) {
      this._skipNewlines();
      const tok = this._peek();

      if (tok.type === TokenType.RBRACE) {
        this._consume(TokenType.RBRACE);
        break;
      }

      if (tok.type === TokenType.EOF) {
        this._error('Unterminated inline object — expected \'}\'', tok);
      }

      entries.push(this._parseSectionEntry());
      this._skipNewlines();

      if (this._peek().type === TokenType.COMMA) {
        this._advance();
      }
    }

    return new ObjectNode(entries, startTok.line, startTok.column);
  }

  // ─── Builtin calls ────────────────────────────────────────────────────────────

  /**
   * Parses: env("VAR_NAME") or env("VAR_NAME", defaultValue)
   */
  _parseEnvCall() {
    const funcTok = this._consume(TokenType.ENV);
    this._consumePunct('(', funcTok);

    const varNameTok = this._peek();
    if (varNameTok.type !== TokenType.STRING) {
      this._error(
        `env() expects a string variable name, got '${varNameTok.raw}'`,
        varNameTok
      );
    }
    const varName = this._consume(TokenType.STRING).value;

    let defaultValue = null;

    this._skipNewlines();
    if (this._peek().type === TokenType.COMMA) {
      this._advance(); // consume comma
      this._skipNewlines();
      defaultValue = this._parseValue();
    }

    this._skipNewlines();
    this._consumePunct(')', funcTok);

    return new EnvCallNode(varName, defaultValue, funcTok.line, funcTok.column);
  }

  /**
   * Parses: required("VAR_NAME")
   */
  _parseRequiredCall() {
    const funcTok = this._consume(TokenType.REQUIRED);
    this._consumePunct('(', funcTok);

    const varNameTok = this._peek();
    if (varNameTok.type !== TokenType.STRING) {
      this._error(
        `required() expects a string variable name, got '${varNameTok.raw}'`,
        varNameTok
      );
    }
    const varName = this._consume(TokenType.STRING).value;

    this._skipNewlines();
    this._consumePunct(')', funcTok);

    return new RequiredCallNode(varName, funcTok.line, funcTok.column);
  }

  /**
   * Parses: secret(value)
   */
  _parseSecretCall() {
    const funcTok = this._consume(TokenType.SECRET);
    this._consumePunct('(', funcTok);

    this._skipNewlines();
    const inner = this._parseValue();
    this._skipNewlines();

    this._consumePunct(')', funcTok);

    return new SecretCallNode(inner, funcTok.line, funcTok.column);
  }

  /**
   * Consumes a LPAREN or RPAREN token.
   */
  _consumePunct(char, contextTok) {
    const expectedType = char === '(' ? TokenType.LPAREN : TokenType.RPAREN;
    const tok = this._peek();
    if (tok.type === expectedType) {
      this._advance();
      return;
    }
    this._error(
      `Expected '${char}' in ${contextTok.raw}() call, got '${tok.raw}'`,
      tok
    );
  }

  // ─── Token stream helpers ─────────────────────────────────────────────────────

  _peek() {
    return this._tokens[this._pos] ?? { type: TokenType.EOF, value: null, raw: '<EOF>', line: 0, column: 0 };
  }

  _advance() {
    const tok = this._tokens[this._pos];
    if (tok && tok.type !== TokenType.EOF) this._pos++;
    return tok;
  }

  _atEnd() {
    return this._peek().type === TokenType.EOF;
  }

  /**
   * Consumes a token of the expected type or throws ParseError.
   * @param {string} type
   * @returns {import('../lexer/Token.js').Token}
   */
  _consume(type) {
    const tok = this._peek();
    if (tok.type !== type) {
      this._error(
        `Expected ${type}, got '${tok.raw}'`,
        tok,
        `Expected ${type}`
      );
    }
    return this._advance();
  }

  _skipNewlines() {
    // In our token stream, newlines are consumed by the lexer (not emitted).
    // This method is a no-op here but is kept for clarity/future extension.
  }

  /**
   * @param {string} message
   * @param {import('../lexer/Token.js').Token} tok
   * @param {string} [expected]
   */
  _error(message, tok, expected) {
    throw new ParseError(message, {
      file: this._file,
      line: tok?.line ?? this._peek().line,
      column: tok?.column ?? this._peek().column,
      expected: expected ?? null,
    });
  }
}
