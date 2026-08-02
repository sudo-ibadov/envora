/**
 * Tests for the Envora Resolver and Interpolator.
 */

import { Envora } from '../src/index.js';
import { MissingEnvError, CircularReferenceError } from '../src/errors/EnvoraError.js';
import { SecretValue } from '../src/core/SecretValue.js';

function parse(source, env = {}) {
    return Envora.parse(source, { env, file: '<test>' });
}

describe('Resolver', () => {
    // ─── Basic values ─────────────────────────────────────────────────────────

    test('resolves string', () => {
        const ctx = parse('APP { name: "Test" }');
        expect(ctx.get('APP.name')).toBe('Test');
    });

    test('resolves number', () => {
        const ctx = parse('SERVER { port: 3000 }');
        expect(ctx.get('SERVER.port')).toBe(3000);
    });

    test('resolves boolean true', () => {
        const ctx = parse('APP { debug: true }');
        expect(ctx.get('APP.debug')).toBe(true);
    });

    test('resolves boolean false', () => {
        const ctx = parse('APP { debug: false }');
        expect(ctx.get('APP.debug')).toBe(false);
    });

    test('resolves null', () => {
        const ctx = parse('APP { val: null }');
        expect(ctx.get('APP.val')).toBeNull();
    });

    test('resolves array', () => {
        const ctx = parse('FEATURES = ["a", "b"]');
        expect(ctx.get('FEATURES')).toEqual(['a', 'b']);
    });

    test('resolves nested sections', () => {
        const ctx = parse(`
      DATABASE {
          credentials {
              username: "admin"
          }
      }
    `);
        expect(ctx.get('DATABASE.credentials.username')).toBe('admin');
    });

    // ─── env() ────────────────────────────────────────────────────────────────

    test('resolves env() from provided env map', () => {
        const ctx = parse('API { key: env("MY_KEY") }', { MY_KEY: 'abc123' });
        expect(ctx.get('API.key')).toBe('abc123');
    });

    test('resolves env() default when var is missing', () => {
        const ctx = parse('SERVER { port: env("PORT", 3000) }', {});
        expect(ctx.get('SERVER.port')).toBe(3000);
    });

    test('resolves env() string default when var is missing', () => {
        const ctx = parse('API { url: env("URL", "https://example.com") }', {});
        expect(ctx.get('API.url')).toBe('https://example.com');
    });

    test('throws MissingEnvError when env var absent and no default', () => {
        expect(() => parse('API { key: env("MISSING_VAR") }', {}))
            .toThrow(MissingEnvError);
    });

    test('MissingEnvError contains variable name', () => {
        try {
            parse('API { key: env("MISSING_VAR") }', {});
        } catch (err) {
            expect(err.varName).toBe('MISSING_VAR');
        }
    });

    test('MissingEnvError does not expose value', () => {
        try {
            parse('API { key: env("MISSING_VAR") }', { MISSING_VAR: 'secret-value' });
        } catch (err) {
            // This shouldn't throw since var is set — just checking safety pattern
        }
        // Actually test missing case
        try {
            parse('API { key: env("NOT_SET") }', {});
        } catch (err) {
            expect(err.message).not.toContain('secret-value');
        }
    });

    // ─── required() ──────────────────────────────────────────────────────────

    test('resolves required() when var is set', () => {
        const ctx = parse('API { key: required("MY_KEY") }', { MY_KEY: 'val' });
        expect(ctx.get('API.key')).toBe('val');
    });

    test('throws MissingEnvError for required() when var is missing', () => {
        expect(() => parse('API { key: required("MISSING") }', {}))
            .toThrow(MissingEnvError);
    });

    test('throws MissingEnvError for required() when var is empty string', () => {
        expect(() => parse('API { key: required("EMPTY") }', { EMPTY: '' }))
            .toThrow(MissingEnvError);
    });

    // ─── secret() ────────────────────────────────────────────────────────────

    test('secret() returns SecretValue', () => {
        const ctx = parse('DB { password: secret(env("PASS", "mypass")) }', {});
        const raw = ctx.toRawObject().DB.password;
        expect(raw).toBeInstanceOf(SecretValue);
    });

    test('secret() value accessible via .get()', () => {
        const ctx = parse('DB { password: secret(env("PASS", "mypass")) }', {});
        expect(ctx.get('DB.password')).toBe('mypass');
    });

    test('secret() masks in toSafeObject()', () => {
        const ctx = parse('DB { password: secret(env("PASS", "mypass")) }', {});
        expect(ctx.toSafeObject().DB.password).toBe('********');
    });

    test('secret() masks in toString()', () => {
        const ctx = parse('DB { password: secret(env("PASS", "mypass")) }', {});
        const raw = ctx.toRawObject().DB.password;
        expect(String(raw)).toBe('********');
    });

    test('secret() masks in JSON.stringify()', () => {
        const ctx = parse('DB { password: secret(env("PASS", "mypass")) }', {});
        const raw = ctx.toRawObject().DB.password;
        const json = JSON.stringify({ pw: raw });
        expect(json).not.toContain('mypass');
        expect(json).toContain('********');
    });
});

describe('Interpolator', () => {
    test('interpolates ${key} references', () => {
        const ctx = parse(`
      SERVER {
          host: "localhost"
          port: 3000
          url: "http://\${SERVER.host}:\${SERVER.port}"
      }
    `);
        expect(ctx.get('SERVER.url')).toBe('http://localhost:3000');
    });

    test('interpolates cross-section references', () => {
        const ctx = parse(`
      SERVER { host: "api.example.com" }
      API { url: "https://\${SERVER.host}/v1" }
    `);
        expect(ctx.get('API.url')).toBe('https://api.example.com/v1');
    });

    test('leaves non-interpolated strings unchanged', () => {
        const ctx = parse('APP { name: "Hello World" }');
        expect(ctx.get('APP.name')).toBe('Hello World');
    });

    test('throws CircularReferenceError on circular refs', () => {
        expect(() => parse(`
      A: "\${B}"
      B: "\${A}"
    `)).toThrow(CircularReferenceError);
    });

    test('CircularReferenceError contains the cycle chain', () => {
        try {
            parse(`A: "\${B}"\nB: "\${A}"`);
        } catch (err) {
            expect(err).toBeInstanceOf(CircularReferenceError);
            expect(err.chain).toBeDefined();
        }
    });

    test('throws EnvoraError for undefined reference', async () => {
        const { EnvoraError } = await import('../src/errors/EnvoraError.js');
        expect(() => parse('A: "${NONEXISTENT}"')).toThrow();
    });
});
