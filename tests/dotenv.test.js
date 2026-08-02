/**
 * Tests for the DotenvLoader.
 */

import { DotenvLoader } from '../src/loaders/DotenvLoader.js';
import { ParseError } from '../src/errors/EnvoraError.js';

function parse(source) {
  return new DotenvLoader().parse(source, { file: '<test>' });
}

describe('DotenvLoader', () => {
  test('parses simple KEY=value', () => {
    const ctx = parse('PORT=3000');
    expect(ctx.get('PORT')).toBe('3000');
  });

  test('parses multiple entries', () => {
    const ctx = parse('HOST=localhost\nPORT=3000');
    expect(ctx.get('HOST')).toBe('localhost');
    expect(ctx.get('PORT')).toBe('3000');
  });

  test('skips empty lines', () => {
    const ctx = parse('\nPORT=3000\n\n');
    expect(ctx.get('PORT')).toBe('3000');
  });

  test('skips comment lines', () => {
    const ctx = parse('# comment\nPORT=3000');
    expect(ctx.get('PORT')).toBe('3000');
    expect(ctx.has('#')).toBe(false);
  });

  test('parses double-quoted value', () => {
    const ctx = parse('NAME="Hello World"');
    expect(ctx.get('NAME')).toBe('Hello World');
  });

  test('parses single-quoted value', () => {
    const ctx = parse("NAME='Hello World'");
    expect(ctx.get('NAME')).toBe('Hello World');
  });

  test('parses empty value', () => {
    const ctx = parse('EMPTY=');
    expect(ctx.get('EMPTY')).toBe('');
  });

  test('handles escape sequences in double quotes', () => {
    const ctx = parse('MSG="line1\\nline2"');
    expect(ctx.get('MSG')).toBe('line1\nline2');
  });

  test('does NOT process escape sequences in single quotes', () => {
    const ctx = parse("MSG='line1\\nline2'");
    expect(ctx.get('MSG')).toBe('line1\\nline2');
  });

  test('strips inline comments', () => {
    const ctx = parse('PORT=3000 # port number');
    expect(ctx.get('PORT')).toBe('3000');
  });

  test('parses DEBUG=true as string', () => {
    const ctx = parse('DEBUG=true');
    expect(ctx.get('DEBUG')).toBe('true');
  });

  test('throws ParseError for missing =', () => {
    expect(() => parse('INVALID')).toThrow(ParseError);
  });

  test('throws ParseError for empty key', () => {
    expect(() => parse('=value')).toThrow(ParseError);
  });

  test('handles Windows CRLF line endings', () => {
    const ctx = parse('HOST=localhost\r\nPORT=3000');
    expect(ctx.get('HOST')).toBe('localhost');
    expect(ctx.get('PORT')).toBe('3000');
  });

  test('parses DATABASE_URL with complex value', () => {
    const ctx = parse('DATABASE_URL=mongodb://localhost:27017/app');
    expect(ctx.get('DATABASE_URL')).toBe('mongodb://localhost:27017/app');
  });

  test('parses escaped backslash', () => {
    const ctx = parse('PATH="C:\\\\Users"');
    expect(ctx.get('PATH')).toBe('C:\\Users');
  });
});
