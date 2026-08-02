/**
 * Tests for the Context API.
 */

import { Envora } from '../src/index.js';
import { MissingKeyError, ValidationError } from '../src/errors/EnvoraError.js';

const SOURCE = `
APP {
    name: "My Application"
    version: "1.0.0"
    debug: true
    count: 42
    ratio: 3.14
    tag: null
}

SERVER {
    host: "localhost"
    port: 3000
}

FEATURES = ["auth", "logging", "cache"]
`;

function ctx() {
  return Envora.parse(SOURCE);
}

describe('Context', () => {
  // ─── get() ────────────────────────────────────────────────────────────────

  test('get() returns string value', () => {
    expect(ctx().get('APP.name')).toBe('My Application');
  });

  test('get() returns number value', () => {
    expect(ctx().get('SERVER.port')).toBe(3000);
  });

  test('get() returns boolean value', () => {
    expect(ctx().get('APP.debug')).toBe(true);
  });

  test('get() returns null value', () => {
    expect(ctx().get('APP.tag')).toBeNull();
  });

  test('get() returns section as object', () => {
    const server = ctx().get('SERVER');
    expect(server).toEqual({ host: 'localhost', port: 3000 });
  });

  test('get() returns array', () => {
    expect(ctx().get('FEATURES')).toEqual(['auth', 'logging', 'cache']);
  });

  test('get() returns undefined for missing key', () => {
    expect(ctx().get('MISSING')).toBeUndefined();
  });

  test('get() returns fallback for missing key', () => {
    expect(ctx().get('MISSING', 'default')).toBe('default');
  });

  // ─── has() ────────────────────────────────────────────────────────────────

  test('has() returns true for existing key', () => {
    expect(ctx().has('APP.name')).toBe(true);
    expect(ctx().has('SERVER')).toBe(true);
  });

  test('has() returns false for missing key', () => {
    expect(ctx().has('MISSING')).toBe(false);
    expect(ctx().has('APP.missing')).toBe(false);
  });

  // ─── require() ────────────────────────────────────────────────────────────

  test('require() returns value when present', () => {
    expect(ctx().require('APP.name')).toBe('My Application');
  });

  test('require() throws MissingKeyError when absent', () => {
    expect(() => ctx().require('MISSING')).toThrow(MissingKeyError);
  });

  test('require() throws MissingKeyError when null', () => {
    expect(() => ctx().require('APP.tag')).toThrow(MissingKeyError);
  });

  // ─── getString() ──────────────────────────────────────────────────────────

  test('getString() returns string', () => {
    expect(ctx().getString('APP.name')).toBe('My Application');
  });

  test('getString() coerces number to string', () => {
    expect(ctx().getString('SERVER.port')).toBe('3000');
  });

  test('getString() coerces boolean to string', () => {
    expect(ctx().getString('APP.debug')).toBe('true');
  });

  test('getString() returns fallback for missing key', () => {
    expect(ctx().getString('MISSING', 'fallback')).toBe('fallback');
  });

  // ─── getNumber() ──────────────────────────────────────────────────────────

  test('getNumber() returns number', () => {
    expect(ctx().getNumber('SERVER.port')).toBe(3000);
  });

  test('getNumber() returns float', () => {
    expect(ctx().getNumber('APP.ratio')).toBeCloseTo(3.14);
  });

  test('getNumber() coerces numeric string', () => {
    const c = Envora.parse('X { val: "42" }');
    expect(c.getNumber('X.val')).toBe(42);
  });

  test('getNumber() returns fallback for non-number', () => {
    expect(ctx().getNumber('APP.name', -1)).toBe(-1);
  });

  // ─── getBoolean() ─────────────────────────────────────────────────────────

  test('getBoolean() returns boolean', () => {
    expect(ctx().getBoolean('APP.debug')).toBe(true);
  });

  test('getBoolean() coerces "true" string', () => {
    const c = Envora.parse('X { val: "true" }');
    expect(c.getBoolean('X.val')).toBe(true);
  });

  test('getBoolean() coerces "false" string', () => {
    const c = Envora.parse('X { val: "false" }');
    expect(c.getBoolean('X.val')).toBe(false);
  });

  test('getBoolean() returns fallback for missing', () => {
    expect(ctx().getBoolean('MISSING', false)).toBe(false);
  });

  // ─── getArray() ───────────────────────────────────────────────────────────

  test('getArray() returns array', () => {
    expect(ctx().getArray('FEATURES')).toEqual(['auth', 'logging', 'cache']);
  });

  test('getArray() returns fallback for non-array', () => {
    expect(ctx().getArray('APP.name', [])).toEqual([]);
  });

  // ─── validate() ───────────────────────────────────────────────────────────

  test('validate() passes when schema is satisfied', () => {
    expect(() => ctx().validate({
      'APP.name':   { type: 'string', required: true },
      'SERVER.port': { type: 'number', required: true, min: 1, max: 65535 },
    })).not.toThrow();
  });

  test('validate() throws ValidationError for wrong type', () => {
    expect(() => ctx().validate({
      'APP.name': { type: 'number' },
    })).toThrow(ValidationError);
  });

  test('validate() throws ValidationError for missing required', () => {
    expect(() => ctx().validate({
      'MISSING.key': { required: true },
    })).toThrow(ValidationError);
  });

  test('validate() throws ValidationError for out-of-range number', () => {
    expect(() => ctx().validate({
      'SERVER.port': { type: 'number', max: 100 },
    })).toThrow(ValidationError);
  });

  test('validate() throws ValidationError for enum violation', () => {
    expect(() => ctx().validate({
      'APP.version': { type: 'string', enum: ['2.0.0', '3.0.0'] },
    })).toThrow(ValidationError);
  });

  test('validate() passes for valid enum', () => {
    expect(() => ctx().validate({
      'APP.version': { type: 'string', enum: ['1.0.0', '2.0.0'] },
    })).not.toThrow();
  });

  // ─── toSafeObject() ───────────────────────────────────────────────────────

  test('toSafeObject() returns plain object', () => {
    const safe = ctx().toSafeObject();
    expect(safe.APP.name).toBe('My Application');
    expect(safe.SERVER.port).toBe(3000);
  });
});
