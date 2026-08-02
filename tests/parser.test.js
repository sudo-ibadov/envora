/**
 * Tests for the Envora Parser.
 */

import { Lexer } from '../src/lexer/Lexer.js';
import { Parser } from '../src/parser/Parser.js';
import { ParseError } from '../src/errors/EnvoraError.js';

function parse(source) {
  const tokens = new Lexer(source, '<test>').tokenize();
  return new Parser(tokens, '<test>').parse();
}

describe('Parser', () => {
  // ─── Document structure ───────────────────────────────────────────────────

  test('parses empty document', () => {
    const doc = parse('');
    expect(doc.type).toBe('Document');
    expect(doc.entries).toHaveLength(0);
  });

  test('parses comment-only document', () => {
    const doc = parse('# just a comment');
    expect(doc.entries).toHaveLength(0);
  });

  // ─── Sections ────────────────────────────────────────────────────────────

  test('parses empty section', () => {
    const doc = parse('APP {}');
    expect(doc.entries).toHaveLength(1);
    expect(doc.entries[0].type).toBe('Section');
    expect(doc.entries[0].name).toBe('APP');
    expect(doc.entries[0].body).toHaveLength(0);
  });

  test('parses section with single assignment', () => {
    const doc = parse('APP {\n    name: "Test"\n}');
    const section = doc.entries[0];
    expect(section.body).toHaveLength(1);
    expect(section.body[0].type).toBe('Assignment');
    expect(section.body[0].key).toBe('name');
    expect(section.body[0].value.type).toBe('String');
    expect(section.body[0].value.value).toBe('Test');
  });

  test('parses multiple sections', () => {
    const doc = parse(`
      APP { name: "A" }
      SERVER { host: "localhost" }
    `);
    expect(doc.entries).toHaveLength(2);
    expect(doc.entries[0].name).toBe('APP');
    expect(doc.entries[1].name).toBe('SERVER');
  });

  // ─── Assignments ─────────────────────────────────────────────────────────

  test('parses top-level assignment with =', () => {
    const doc = parse('DEBUG = true');
    expect(doc.entries[0].type).toBe('Assignment');
    expect(doc.entries[0].key).toBe('DEBUG');
    expect(doc.entries[0].value.value).toBe(true);
  });

  test('parses top-level assignment with :', () => {
    const doc = parse('DEBUG: false');
    expect(doc.entries[0].type).toBe('Assignment');
    expect(doc.entries[0].value.value).toBe(false);
  });

  // ─── Value types ─────────────────────────────────────────────────────────

  test('parses string value', () => {
    const doc = parse('APP { name: "hello" }');
    expect(doc.entries[0].body[0].value.type).toBe('String');
    expect(doc.entries[0].body[0].value.value).toBe('hello');
  });

  test('parses number value', () => {
    const doc = parse('SERVER { port: 3000 }');
    expect(doc.entries[0].body[0].value.type).toBe('Number');
    expect(doc.entries[0].body[0].value.value).toBe(3000);
  });

  test('parses negative number value', () => {
    const doc = parse('X { val: -42 }');
    expect(doc.entries[0].body[0].value.value).toBe(-42);
  });

  test('parses boolean true', () => {
    const doc = parse('APP { debug: true }');
    expect(doc.entries[0].body[0].value.type).toBe('Boolean');
    expect(doc.entries[0].body[0].value.value).toBe(true);
  });

  test('parses boolean false', () => {
    const doc = parse('APP { debug: false }');
    expect(doc.entries[0].body[0].value.value).toBe(false);
  });

  test('parses null value', () => {
    const doc = parse('APP { val: null }');
    expect(doc.entries[0].body[0].value.type).toBe('Null');
    expect(doc.entries[0].body[0].value.value).toBeNull();
  });

  // ─── Arrays ───────────────────────────────────────────────────────────────

  test('parses empty array', () => {
    const doc = parse('FEATURES = []');
    expect(doc.entries[0].value.type).toBe('Array');
    expect(doc.entries[0].value.elements).toHaveLength(0);
  });

  test('parses array of strings', () => {
    const doc = parse('FEATURES = ["a", "b", "c"]');
    const arr = doc.entries[0].value;
    expect(arr.elements).toHaveLength(3);
    expect(arr.elements[0].value).toBe('a');
    expect(arr.elements[1].value).toBe('b');
    expect(arr.elements[2].value).toBe('c');
  });

  test('parses multiline array', () => {
    const doc = parse(`FEATURES = [
  "authentication",
  "logging"
]`);
    expect(doc.entries[0].value.elements).toHaveLength(2);
  });

  test('parses array of mixed types', () => {
    const doc = parse('X = [1, "two", true, null]');
    const arr = doc.entries[0].value;
    expect(arr.elements[0].type).toBe('Number');
    expect(arr.elements[1].type).toBe('String');
    expect(arr.elements[2].type).toBe('Boolean');
    expect(arr.elements[3].type).toBe('Null');
  });

  // ─── Nested sections ──────────────────────────────────────────────────────

  test('parses nested sections', () => {
    const doc = parse(`
      DATABASE {
          credentials {
              username: "admin"
          }
      }
    `);
    const db = doc.entries[0];
    expect(db.name).toBe('DATABASE');
    expect(db.body[0].type).toBe('Section');
    expect(db.body[0].name).toBe('credentials');
    expect(db.body[0].body[0].key).toBe('username');
  });

  // ─── Env calls ───────────────────────────────────────────────────────────

  test('parses env() without default', () => {
    const doc = parse('API { key: env("API_KEY") }');
    const val = doc.entries[0].body[0].value;
    expect(val.type).toBe('EnvCall');
    expect(val.varName).toBe('API_KEY');
    expect(val.defaultValue).toBeNull();
  });

  test('parses env() with string default', () => {
    const doc = parse('API { url: env("API_URL", "https://example.com") }');
    const val = doc.entries[0].body[0].value;
    expect(val.type).toBe('EnvCall');
    expect(val.defaultValue.type).toBe('String');
    expect(val.defaultValue.value).toBe('https://example.com');
  });

  test('parses env() with number default', () => {
    const doc = parse('SERVER { port: env("PORT", 3000) }');
    const val = doc.entries[0].body[0].value;
    expect(val.defaultValue.type).toBe('Number');
    expect(val.defaultValue.value).toBe(3000);
  });

  // ─── Required calls ───────────────────────────────────────────────────────

  test('parses required()', () => {
    const doc = parse('API { key: required("SECRET_KEY") }');
    const val = doc.entries[0].body[0].value;
    expect(val.type).toBe('RequiredCall');
    expect(val.varName).toBe('SECRET_KEY');
  });

  // ─── Secret calls ─────────────────────────────────────────────────────────

  test('parses secret()', () => {
    const doc = parse('DB { password: secret(env("DB_PASS")) }');
    const val = doc.entries[0].body[0].value;
    expect(val.type).toBe('SecretCall');
    expect(val.inner.type).toBe('EnvCall');
  });

  // ─── Error cases ─────────────────────────────────────────────────────────

  test('throws ParseError on missing colon', () => {
    expect(() => parse('APP { name "Test" }')).toThrow(ParseError);
  });

  test('throws ParseError on unterminated section', () => {
    expect(() => parse('APP {')).toThrow(ParseError);
  });

  test('throws ParseError on unterminated array', () => {
    expect(() => parse('X = [1, 2')).toThrow(ParseError);
  });

  test('ParseError includes line and column', () => {
    try {
      parse('APP {\n    name "Test"\n}');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect(err.line).toBeDefined();
      expect(err.column).toBeDefined();
    }
  });

  test('throws ParseError on non-string env() arg', () => {
    expect(() => parse('API { key: env(123) }')).toThrow(ParseError);
  });
});
