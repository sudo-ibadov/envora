/**
 * Tests for the Envora Lexer.
 */

import { Lexer } from '../src/lexer/Lexer.js';
import { TokenType } from '../src/lexer/Token.js';
import { ParseError } from '../src/errors/EnvoraError.js';

function lex(source) {
  return new Lexer(source, '<test>').tokenize();
}

function types(source) {
  return lex(source).map(t => t.type);
}

describe('Lexer', () => {
  // ─── Basics ──────────────────────────────────────────────────────────────

  test('produces EOF for empty input', () => {
    expect(types('')).toEqual([TokenType.EOF]);
  });

  test('skips whitespace', () => {
    expect(types('   \t  ')).toEqual([TokenType.EOF]);
  });

  test('skips single-line comments', () => {
    expect(types('# this is a comment')).toEqual([TokenType.EOF]);
    expect(types('# comment\n# another')).toEqual([TokenType.EOF]);
  });

  // ─── Identifiers ─────────────────────────────────────────────────────────

  test('tokenizes identifiers', () => {
    const tokens = lex('APP');
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].value).toBe('APP');
  });

  test('tokenizes underscore identifiers', () => {
    const tokens = lex('my_key');
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].value).toBe('my_key');
  });

  // ─── Strings ─────────────────────────────────────────────────────────────

  test('tokenizes simple string', () => {
    const tokens = lex('"hello world"');
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello world');
  });

  test('handles escape sequences in strings', () => {
    const tokens = lex('"line1\\nline2"');
    expect(tokens[0].value).toBe('line1\nline2');
  });

  test('handles escaped quotes', () => {
    const tokens = lex('"say \\"hello\\""');
    expect(tokens[0].value).toBe('say "hello"');
  });

  test('handles unicode escapes', () => {
    const tokens = lex('"\\u0041"'); // A
    expect(tokens[0].value).toBe('A');
  });

  test('throws on unterminated string', () => {
    expect(() => lex('"unterminated')).toThrow(ParseError);
  });

  test('throws on invalid escape sequence', () => {
    expect(() => lex('"\\q"')).toThrow(ParseError);
  });

  // ─── Numbers ─────────────────────────────────────────────────────────────

  test('tokenizes integer', () => {
    const tokens = lex('42');
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe(42);
  });

  test('tokenizes negative integer', () => {
    const tokens = lex('-5');
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe(-5);
  });

  test('tokenizes float', () => {
    const tokens = lex('3.14');
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBeCloseTo(3.14);
  });

  test('tokenizes scientific notation', () => {
    const tokens = lex('1e3');
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe(1000);
  });

  // ─── Booleans ─────────────────────────────────────────────────────────────

  test('tokenizes true', () => {
    const tokens = lex('true');
    expect(tokens[0].type).toBe(TokenType.BOOLEAN);
    expect(tokens[0].value).toBe(true);
  });

  test('tokenizes false', () => {
    const tokens = lex('false');
    expect(tokens[0].type).toBe(TokenType.BOOLEAN);
    expect(tokens[0].value).toBe(false);
  });

  // ─── Null ────────────────────────────────────────────────────────────────

  test('tokenizes null', () => {
    const tokens = lex('null');
    expect(tokens[0].type).toBe(TokenType.NULL);
    expect(tokens[0].value).toBeNull();
  });

  // ─── Structure ───────────────────────────────────────────────────────────

  test('tokenizes braces', () => {
    expect(types('{}')).toEqual([TokenType.LBRACE, TokenType.RBRACE, TokenType.EOF]);
  });

  test('tokenizes brackets', () => {
    expect(types('[]')).toEqual([TokenType.LBRACKET, TokenType.RBRACKET, TokenType.EOF]);
  });

  test('tokenizes colon and equals', () => {
    expect(types(':=')).toEqual([TokenType.COLON, TokenType.EQUALS, TokenType.EOF]);
  });

  test('tokenizes comma', () => {
    expect(types(',')).toEqual([TokenType.COMMA, TokenType.EOF]);
  });

  test('tokenizes parens', () => {
    expect(types('()')).toEqual([TokenType.LPAREN, TokenType.RPAREN, TokenType.EOF]);
  });

  // ─── Builtins ────────────────────────────────────────────────────────────

  test('tokenizes env keyword before (', () => {
    const tokens = lex('env(');
    expect(tokens[0].type).toBe(TokenType.ENV);
  });

  test('tokenizes required keyword before (', () => {
    const tokens = lex('required(');
    expect(tokens[0].type).toBe(TokenType.REQUIRED);
  });

  test('tokenizes secret keyword before (', () => {
    const tokens = lex('secret(');
    expect(tokens[0].type).toBe(TokenType.SECRET);
  });

  test('treats env as identifier when no ( follows', () => {
    const tokens = lex('env');
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
  });

  // ─── Location tracking ────────────────────────────────────────────────────

  test('tracks line and column', () => {
    const tokens = lex('APP\nname');
    expect(tokens[0].line).toBe(1);
    expect(tokens[0].column).toBe(1);
    expect(tokens[1].line).toBe(2);
    expect(tokens[1].column).toBe(1);
  });

  test('throws with location info on unexpected char', () => {
    try {
      lex('@invalid');
      fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect(err.line).toBe(1);
    }
  });
});
