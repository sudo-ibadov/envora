/**
 * Tests for SecretValue masking and safety.
 */

import { SecretValue } from '../src/core/SecretValue.js';
import { Envora } from '../src/index.js';

describe('SecretValue', () => {
  test('value property returns the actual value', () => {
    const s = new SecretValue('my-secret');
    expect(s.value).toBe('my-secret');
  });

  test('toString() returns mask', () => {
    const s = new SecretValue('my-secret');
    expect(s.toString()).toBe('********');
    expect(String(s)).toBe('********');
  });

  test('toJSON() returns mask', () => {
    const s = new SecretValue('my-secret');
    expect(s.toJSON()).toBe('********');
  });

  test('JSON.stringify masks the value', () => {
    const s = new SecretValue('super-secret');
    const json = JSON.stringify({ password: s });
    expect(json).not.toContain('super-secret');
    expect(json).toContain('********');
  });

  test('isSecret property is true', () => {
    expect(new SecretValue('x').isSecret).toBe(true);
  });

  test('type property returns typeof inner value', () => {
    expect(new SecretValue('str').type).toBe('string');
    expect(new SecretValue(42).type).toBe('number');
  });

  test('template literal interpolation masks the value', () => {
    const s = new SecretValue('top-secret');
    const msg = `password is: ${s}`;
    expect(msg).toBe('password is: ********');
    expect(msg).not.toContain('top-secret');
  });

  test('not enumerable — does not leak via Object.keys on plain obj', () => {
    const s = new SecretValue('leak-me');
    // The _value property is non-enumerable
    expect(Object.keys(s)).not.toContain('_value');
  });

  // ─── Integration with Envora ──────────────────────────────────────────────

  test('secret() in config resolves via ctx.get()', () => {
    const ctx = Envora.parse(
      'DB { password: secret(env("PASS", "mysecret")) }',
      { env: {} }
    );
    expect(ctx.get('DB.password')).toBe('mysecret');
  });

  test('secret() raw object contains SecretValue instance', () => {
    const ctx = Envora.parse(
      'DB { password: secret(env("PASS", "mysecret")) }',
      { env: {} }
    );
    expect(ctx.toRawObject().DB.password).toBeInstanceOf(SecretValue);
  });

  test('toSafeObject() masks secret values', () => {
    const ctx = Envora.parse(
      'DB { password: secret(env("PASS", "mysecret")) }',
      { env: {} }
    );
    expect(ctx.toSafeObject().DB.password).toBe('********');
    expect(ctx.toSafeObject().DB.password).not.toBe('mysecret');
  });
});
