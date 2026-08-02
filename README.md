# Envora

```
  ███████╗███╗   ██╗██╗   ██╗ ██████╗ ██████╗  █████╗
  ██╔════╝████╗  ██║██║   ██║██╔═══██╗██╔══██╗██╔══██╗
  █████╗  ██╔██╗ ██║██║   ██║██║   ██║██████╔╝███████║
  ██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██║   ██║██╔══██╗██╔══██║
  ███████╗██║ ╚████║ ╚████╔╝ ╚██████╔╝██║  ██║██║  ██║
  ╚══════╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
```

**Modern configuration and environment management for Node.js.**

[![npm version](https://img.shields.io/npm/v/envora.svg)](https://www.npmjs.com/package/envora)
[![Node.js](https://img.shields.io/node/v/envora.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Envora is a production-quality configuration system with its own expressive file format (`.envora`), a proper lexer/parser/AST pipeline, environment variable integration, secret masking, interpolation, validation, formatting, and a CLI — all with zero production dependencies.

---

## Installation

```bash
npm install envora
```

## Quick Start

```js
import { Envora } from 'envora';

const config = await Envora.load('./config.envora');

console.log(config.get('APP.name'));        // "My Application"
console.log(config.get('SERVER.port'));     // 3000
console.log(config.getBoolean('APP.debug')); // true
```

---

## The `.envora` Format

`.envora` is Envora's primary configuration format. It supports sections, typed values, nested objects, arrays, comments, environment variable references, and interpolation.

```envora
# Application configuration

APP {
    name: "My Application"
    environment: "production"
    debug: false
    version: "1.0.0"
}

SERVER {
    host: "0.0.0.0"
    port: 3000
    url: "http://${SERVER.host}:${SERVER.port}"
}

DATABASE {
    host: "localhost"
    port: 27017
    name: "myapp"
    credentials {
        username: "admin"
        password: secret(env("DATABASE_PASSWORD"))
    }
}

FEATURES = [
    "authentication",
    "logging",
    "cache"
]
```

### Supported types

| Type    | Example                        |
|---------|-------------------------------|
| String  | `name: "hello"`               |
| Number  | `port: 3000`                  |
| Boolean | `debug: true`                 |
| Null    | `val: null`                   |
| Array   | `items = ["a", "b"]`          |
| Object  | `nested { key: "val" }`       |
| env()   | `key: env("MY_VAR", "default")`|
| required() | `key: required("VAR")`    |
| secret()   | `pass: secret(env("PASS"))` |

---

## Environment Variables

Envora reads directly from `process.env` (or a custom env map you provide).

```envora
API {
    key: env("API_KEY")
    url: env("API_URL", "https://api.example.com")
    timeout: env("TIMEOUT", 5000)
}
```

- `env("VAR")` — reads `process.env.VAR`. Throws `MissingEnvError` if not set and no default is given.
- `env("VAR", defaultValue)` — uses the default if the variable is absent.
- `required("VAR")` — throws `MissingEnvError` even if the variable is an empty string.

---

## Secrets

Mark sensitive values with `secret()` to prevent accidental exposure:

```envora
DATABASE {
    password: secret(env("DATABASE_PASSWORD"))
}
```

The value behaves normally in application code via `config.get()`, but is masked everywhere else:

```js
config.get('DATABASE.password')     // → "actual-password" (for app use)
config.toSafeObject()               // → { DATABASE: { password: "********" } }
String(rawSecretValue)              // → "********"
JSON.stringify({ pw: rawValue })    // → {"pw":"********"}
```

---

## Variable Interpolation

Reference other config values inside strings using `${path}` syntax:

```envora
SERVER {
    host: "localhost"
    port: 3000
    url: "http://${SERVER.host}:${SERVER.port}"
}
```

Cross-section references work too:

```envora
SERVER { host: "api.example.com" }
API    { url: "https://${SERVER.host}/v1" }
```

Circular references are detected and throw a `CircularReferenceError`:

```envora
A: "${B}"
B: "${A}"   # → CircularReferenceError: A → B → A
```

---

## API

### `Envora.load(filePath, options?)`

Loads a `.envora` or `.env` file from disk. Auto-detects format by extension.

```js
const config = await Envora.load('./config.envora');
const config = await Envora.load('./.env');
```

### `Envora.parse(source, options?)`

Parses source text without file I/O. Useful for testing.

```js
const config = Envora.parse('APP { name: "Test" }');
```

### `Envora.fromObject(obj)`

Creates a `Context` from a plain object.

```js
const config = Envora.fromObject({ APP: { name: 'Test' } });
```

---

## Context API

All load methods return a `Context` instance.

```js
const config = await Envora.load('./config.envora');

config.get('APP.name')              // any value, undefined if missing
config.get('MISSING', 'fallback')   // returns fallback
config.has('SERVER')                // true/false
config.require('API.key')           // throws MissingKeyError if absent/null

config.getString('APP.name')        // coerces to string
config.getNumber('SERVER.port')     // coerces to number
config.getBoolean('APP.debug')      // coerces to boolean
config.getArray('FEATURES')         // returns array or fallback
config.getObject('DATABASE')        // returns object section

config.validate(schema)             // throws ValidationError if invalid
config.toSafeObject()               // plain object with secrets masked
config.toRawObject()                // plain object with SecretValue instances
```

---

## Validation

```js
import { Schema } from 'envora';

config.validate({
  'SERVER.port': Schema.number({ required: true, min: 1, max: 65535 }),
  'APP.name':    Schema.string({ required: true }),
  'APP.debug':   Schema.boolean(),
  'APP.env':     Schema.string({ enum: ['development', 'staging', 'production'] }),
});
```

All validation errors are collected before throwing — one `ValidationError` with all failures listed.

### Rule options

| Option     | Types           | Description               |
|------------|-----------------|---------------------------|
| `required` | all             | Must be present and non-null |
| `type`     | all             | `string`, `number`, `boolean`, `array`, `object` |
| `min`      | number, string  | Min value / min length    |
| `max`      | number, string  | Max value / max length    |
| `enum`     | string          | Allowed values            |
| `pattern`  | string          | Regex pattern             |

---

## Traditional `.env` Support

```js
const config = await Envora.load('./.env');
config.get('PORT');
config.get('DATABASE_URL');
```

Supports:
- `KEY=value`
- `KEY="quoted value"` (with escape sequences)
- `KEY='single quoted'`
- `# comments`
- `KEY=` (empty values)
- Windows CRLF line endings

---

## CLI

```bash
# Initialize a starter config
npx envora init

# Format a .envora file
npx envora format config.envora

# Check formatting (exit 1 if not formatted)
npx envora format --check

# Validate a config file
npx envora check config.envora

# Migrate a .env file to .envora
npx envora migrate .env

# Show version
npx envora version
```

### `envora init`

Creates `config.envora` and `.env.example` in the current directory:

```
  ENVORA  v1.0.0

  ✔ Created config.envora
  ✔ Created .env.example

  Environment configuration initialized.
```

### `envora format`

Enforces canonical style:
- 4-space indentation
- One key per line
- Blank line between sections
- Trailing newline

### `envora migrate .env`

Converts a `.env` file to `.envora`, grouping keys by common prefix:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
PORT=3000
```

Becomes:

```envora
DATABASE {
    host: "localhost"
    port: 5432
}

PORT: 3000
```

---

## Discord Bot Example

Envora works for any Node.js application. This is just a usage example — Envora has no Discord dependency.

```envora
# discord-bot.envora
DISCORD {
    token: secret(env("DISCORD_TOKEN"))
    clientId: env("DISCORD_CLIENT_ID")
    guildId: env("DISCORD_GUILD_ID")
}
```

```js
import { Envora } from 'envora';
import { Client } from 'discord.js';

const config = await Envora.load('./discord-bot.envora');

const client = new Client({ intents: [] });
client.login(config.get('DISCORD.token'));
```

---

## Express Application Example

```envora
# express.envora
SERVER {
    host: "0.0.0.0"
    port: 3000
}

JWT {
    secret: secret(env("JWT_SECRET"))
    expiresIn: "7d"
}
```

```js
import express from 'express';
import { Envora, Schema } from 'envora';

const config = await Envora.load('./express.envora');

config.validate({
  'SERVER.port': Schema.number({ required: true }),
  'JWT.secret':  Schema.string({ required: true }),
});

const app = express();
app.listen(config.getNumber('SERVER.port'));
```

---

## Errors

All errors extend `EnvoraError` and include file, line, and column information:

```
ParseError: Expected ':' after key 'port'
  File:   config.envora
  Line:   12
  Column: 9

      port 3000
          ^
```

Error classes:
- `ParseError` — syntax errors in `.envora` files
- `MissingEnvError` — environment variable not set (never exposes values)
- `CircularReferenceError` — `${A}` references `${A}`
- `MissingKeyError` — `config.require()` called on absent key
- `ValidationError` — schema validation failure
- `LoadError` — file cannot be read

---

## Architecture

```
Source text
    │
    ▼
  Lexer           (character-by-character, proper token types)
    │
    ▼
  Tokens          (STRING, NUMBER, BOOLEAN, IDENTIFIER, ENV, …)
    │
    ▼
  Parser          (recursive descent, AST nodes)
    │
    ▼
  AST             (DocumentNode, SectionNode, AssignmentNode, …)
    │
    ▼
  Resolver        (env() / required() / secret() evaluation)
    │
    ▼
  Interpolator    (${...} reference resolution, cycle detection)
    │
    ▼
  Context         (typed API: get, getString, validate, …)
```

---

## FAQ

**Does Envora depend on Discord.js?**
No. Envora is completely general-purpose. The Discord example shows how you'd use it *with* discord.js, but Envora itself has no Discord dependency.

**Can I use Envora with CommonJS?**
Envora is a native ESM package (`"type": "module"`). Use `import` or dynamic `await import('envora')` in CommonJS contexts.

**Does Envora write to `process.env`?**
No. Envora reads from the environment but never mutates it.

**Are secrets safe in error messages?**
Yes. `MissingEnvError` only includes the variable *name*, never its value. `SecretValue` masks itself in all string representations.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `npm test` — all tests must pass
4. Submit a pull request

---

## License

MIT — see [LICENSE](LICENSE).
