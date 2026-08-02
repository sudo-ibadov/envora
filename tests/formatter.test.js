/**
 * Tests for the Envora Formatter.
 */

import { Formatter } from '../src/formatter/Formatter.js';

function fmt(source) {
  return new Formatter().format(source, '<test>');
}

describe('Formatter', () => {
  // ─── Determinism ─────────────────────────────────────────────────────────

  test('is idempotent — formatting twice gives same result', () => {
    const source = `APP {
    name: "Test"
    debug: false
    port: 3000
}
`;
    expect(fmt(fmt(source))).toBe(fmt(source));
  });

  test('is idempotent three times', () => {
    const source = 'SERVER { host: "localhost" port: 8080 }';
    expect(fmt(fmt(fmt(source)))).toBe(fmt(source));
  });

  // ─── Section formatting ───────────────────────────────────────────────────

  test('formats section with 4-space indent', () => {
    const out = fmt('APP{name:"Test"}');
    expect(out).toContain('APP {');
    expect(out).toContain('    name: "Test"');
    expect(out).toContain('}');
  });

  test('puts closing brace on its own line', () => {
    const out = fmt('APP { name: "Test" }');
    const lines = out.split('\n');
    expect(lines.some(l => l.trim() === '}')).toBe(true);
  });

  test('formats multiple entries one per line', () => {
    const out = fmt('APP { name: "Test" debug: false port: 3000 }');
    expect(out).toContain('    name: "Test"');
    expect(out).toContain('    debug: false');
    expect(out).toContain('    port: 3000');
  });

  // ─── String formatting ────────────────────────────────────────────────────

  test('preserves string values', () => {
    const out = fmt('APP { name: "Hello World" }');
    expect(out).toContain('"Hello World"');
  });

  test('re-escapes special characters in strings', () => {
    const out = fmt('APP { msg: "line1\\nline2" }');
    expect(out).toContain('"line1\\nline2"');
  });

  // ─── Number and boolean formatting ───────────────────────────────────────

  test('preserves numbers', () => {
    const out = fmt('SERVER { port: 3000 }');
    expect(out).toContain('port: 3000');
  });

  test('preserves booleans', () => {
    const out = fmt('APP { debug: true }');
    expect(out).toContain('debug: true');
  });

  test('preserves null', () => {
    const out = fmt('APP { val: null }');
    expect(out).toContain('val: null');
  });

  // ─── Array formatting ─────────────────────────────────────────────────────

  test('formats array with elements on separate lines', () => {
    const out = fmt('FEATURES = ["a", "b", "c"]');
    expect(out).toContain('FEATURES = [');
    expect(out).toContain('"a"');
    expect(out).toContain('"b"');
    expect(out).toContain('"c"');
  });

  test('formats empty array inline', () => {
    const out = fmt('X = []');
    expect(out).toContain('X = []');
  });

  // ─── Nested section formatting ────────────────────────────────────────────

  test('formats nested sections with increased indent', () => {
    const out = fmt(`DATABASE { credentials { username: "admin" } }`);
    expect(out).toContain('DATABASE {');
    expect(out).toContain('    credentials {');
    expect(out).toContain('        username: "admin"');
    expect(out).toContain('    }');
  });

  // ─── Builtin call formatting ──────────────────────────────────────────────

  test('formats env() without default', () => {
    const out = fmt('API { key: env("API_KEY") }');
    expect(out).toContain('env("API_KEY")');
  });

  test('formats env() with default', () => {
    const out = fmt('API { url: env("URL", "https://example.com") }');
    expect(out).toContain('env("URL", "https://example.com")');
  });

  test('formats required()', () => {
    const out = fmt('API { key: required("SECRET") }');
    expect(out).toContain('required("SECRET")');
  });

  test('formats secret()', () => {
    const out = fmt('DB { password: secret(env("PASS")) }');
    expect(out).toContain('secret(env("PASS"))');
  });

  // ─── Blank lines between top-level entries ────────────────────────────────

  test('adds blank line between top-level sections', () => {
    const out = fmt('APP { name: "A" } SERVER { host: "b" }');
    const lines = out.split('\n');
    // Find the blank line between APP } and SERVER {
    const rbrace = lines.findIndex(l => l.trim() === '}');
    expect(lines[rbrace + 1]).toBe('');
  });

  // ─── Trailing newline ─────────────────────────────────────────────────────

  test('ends with a single newline', () => {
    const out = fmt('APP { name: "Test" }');
    expect(out.endsWith('\n')).toBe(true);
    expect(out.endsWith('\n\n')).toBe(false);
  });
});
