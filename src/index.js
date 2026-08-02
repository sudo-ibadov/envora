/**
 * @fileoverview Envora — Modern configuration and environment management for Node.js.
 *
 * @example
 * import { Envora } from 'envora';
 *
 * const config = await Envora.load('./config.envora');
 * console.log(config.get('APP.name'));
 * console.log(config.getNumber('SERVER.port'));
 * console.log(config.getBoolean('APP.debug'));
 *
 * config.validate({
 *   'SERVER.port': { type: 'number', required: true, min: 1, max: 65535 },
 *   'APP.name':    { type: 'string', required: true },
 * });
 */

// Main API
export { Envora } from './core/Envora.js';

// Context (resolved config)
export { Context } from './core/Context.js';

// SecretValue
export { SecretValue } from './core/SecretValue.js';

// Loaders
export { EnvoraLoader } from './loaders/EnvoraLoader.js';
export { DotenvLoader } from './loaders/DotenvLoader.js';

// Parser pipeline
export { Lexer } from './lexer/Lexer.js';
export { Token, TokenType } from './lexer/Token.js';
export { Parser } from './parser/Parser.js';
export { Resolver } from './resolver/Resolver.js';
export { interpolate } from './resolver/Interpolator.js';

// Formatter
export { Formatter } from './formatter/Formatter.js';
export { Printer } from './formatter/Printer.js';

// Validation
export { Validator } from './validation/Validator.js';
export { Schema } from './validation/Schema.js';

// Migration
export { Migrator } from './migrate/Migrator.js';

// Errors
export {
  EnvoraError,
  ParseError,
  MissingEnvError,
  CircularReferenceError,
  MissingKeyError,
  ValidationError,
  LoadError,
} from './errors/EnvoraError.js';
