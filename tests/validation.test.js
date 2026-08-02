/**
 * Tests for the Validator and Schema.
 */

import { Envora } from '../src/index.js';
import { Schema } from '../src/validation/Schema.js';
import { ValidationError } from '../src/errors/EnvoraError.js';

const SOURCE = `
APP {
    name: "My App"
    version: "2.0.0"
    debug: true
    count: 42
}

SERVER {
    host: "localhost"
    port: 3000
}
`;

describe('Validator', () => {
  function ctx() {
    return Envora.parse(SOURCE);
  }

  // ─── Schema helpers ───────────────────────────────────────────────────────

  test('Schema.string() creates string rule', () => {
    const rule = Schema.string({ required: true });
    expect(rule.type).toBe('string');
    expect(rule.required).toBe(true);
  });

  test('Schema.number() creates number rule', () => {
    const rule = Schema.number({ min: 1, max: 65535 });
    expect(rule.type).toBe('number');
    expect(rule.min).toBe(1);
    expect(rule.max).toBe(65535);
  });

  test('Schema.boolean() creates boolean rule', () => {
    expect(Schema.boolean().type).toBe('boolean');
  });

  // ─── Valid cases ──────────────────────────────────────────────────────────

  test('passes validation for correct string', () => {
    expect(() => ctx().validate({ 'APP.name': Schema.string({ required: true }) }))
      .not.toThrow();
  });

  test('passes validation for correct number range', () => {
    expect(() => ctx().validate({
      'SERVER.port': Schema.number({ required: true, min: 1, max: 65535 }),
    })).not.toThrow();
  });

  test('passes validation for correct boolean', () => {
    expect(() => ctx().validate({ 'APP.debug': Schema.boolean() }))
      .not.toThrow();
  });

  test('passes for optional missing field', () => {
    expect(() => ctx().validate({ 'MISSING.key': Schema.string() }))
      .not.toThrow();
  });

  // ─── Invalid cases ────────────────────────────────────────────────────────

  test('throws ValidationError for wrong type', () => {
    expect(() => ctx().validate({ 'APP.name': Schema.number() }))
      .toThrow(ValidationError);
  });

  test('throws for missing required field', () => {
    expect(() => ctx().validate({ 'MISSING.key': Schema.string({ required: true }) }))
      .toThrow(ValidationError);
  });

  test('throws for number below min', () => {
    expect(() => ctx().validate({
      'SERVER.port': Schema.number({ min: 10000 }),
    })).toThrow(ValidationError);
  });

  test('throws for number above max', () => {
    expect(() => ctx().validate({
      'SERVER.port': Schema.number({ max: 100 }),
    })).toThrow(ValidationError);
  });

  test('throws for string length below min', () => {
    expect(() => ctx().validate({
      'APP.name': Schema.string({ min: 100 }),
    })).toThrow(ValidationError);
  });

  test('throws for enum violation', () => {
    expect(() => ctx().validate({
      'APP.version': Schema.string({ enum: ['3.0.0', '4.0.0'] }),
    })).toThrow(ValidationError);
  });

  test('passes for valid enum', () => {
    expect(() => ctx().validate({
      'APP.version': Schema.string({ enum: ['1.0.0', '2.0.0'] }),
    })).not.toThrow();
  });

  // ─── Multiple errors ─────────────────────────────────────────────────────

  test('collects multiple validation errors in one throw', () => {
    try {
      ctx().validate({
        'MISSING1': { required: true },
        'MISSING2': { required: true },
        'APP.name':  { type: 'number' },
      });
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toContain('MISSING1');
      expect(err.message).toContain('MISSING2');
    }
  });

  // ─── Pattern validation ───────────────────────────────────────────────────

  test('passes for matching pattern', () => {
    expect(() => ctx().validate({
      'APP.version': Schema.string({ pattern: /^\d+\.\d+\.\d+$/ }),
    })).not.toThrow();
  });

  test('throws for non-matching pattern', () => {
    expect(() => ctx().validate({
      'APP.name': Schema.string({ pattern: /^\d+$/ }),
    })).toThrow(ValidationError);
  });
});
