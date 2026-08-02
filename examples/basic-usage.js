/**
 * Basic Envora usage example.
 *
 * Run from the examples/ directory:
 *   node basic-usage.js
 */

import { Envora, Schema } from '../src/index.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config = await Envora.load(path.join(__dirname, 'config.envora'));

// ─── Basic access ─────────────────────────────────────────────────────────────

console.log('APP.name:    ', config.get('APP.name'));
console.log('APP.debug:   ', config.get('APP.debug'));
console.log('SERVER.port: ', config.get('SERVER.port'));
console.log('SERVER.url:  ', config.get('SERVER.url'));   // interpolated
console.log('DATABASE.host:', config.get('DATABASE.host'));
console.log('FEATURES:    ', config.get('FEATURES'));

// ─── Typed access ─────────────────────────────────────────────────────────────

const port = config.getNumber('SERVER.port');
const debug = config.getBoolean('APP.debug');
const name = config.getString('APP.name');

console.log('\nTyped access:');
console.log('  port (number):', port, typeof port);
console.log('  debug (boolean):', debug, typeof debug);
console.log('  name (string):', name, typeof name);

// ─── has() / require() ────────────────────────────────────────────────────────

console.log('\nhas():');
console.log('  has DATABASE:', config.has('DATABASE'));
console.log('  has MISSING: ', config.has('MISSING'));

// ─── Secret masking ───────────────────────────────────────────────────────────

console.log('\nSecret masking:');
const safe = config.toSafeObject();
console.log('  DB password (safe):', safe.DATABASE.credentials.password);
console.log('  DB password (actual):', config.get('DATABASE.credentials.password'));

// ─── Validation ───────────────────────────────────────────────────────────────

console.log('\nValidation:');
config.validate({
  'APP.name':    Schema.string({ required: true }),
  'SERVER.port': Schema.number({ required: true, min: 1, max: 65535 }),
  'APP.debug':   Schema.boolean(),
});
console.log('  Validation passed!');

// ─── Discord bot example (agnostic usage) ─────────────────────────────────────

console.log('\nDiscord bot pattern (no discord.js):');
console.log('  Would use: config.get("DISCORD.token") to get token');
console.log('  Envora itself has no Discord dependency.');
