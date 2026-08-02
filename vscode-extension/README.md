# Envora for Visual Studio Code

<p align="center">
  <img src="icons/envora.png" alt="Envora" width="128" />
</p>

<p align="center">
  File icon and syntax highlighting for <code>.envora</code> configuration files.
</p>

---

## Features

- **File icon** — `.envora` files get their own icon in the Explorer and tabs
- **Syntax highlighting** — full colorization for the `.envora` format
- **Comment toggling** — `Ctrl+/` to comment/uncomment lines
- **Bracket matching** — auto-close and highlight matching `{}` `[]` `()`

## What it looks like

When you open or create a `.envora` file you get:

- The Envora icon on the file tab and in the file tree
- Colored section names, keys, strings, numbers, booleans, and `env()` calls

## Usage

1. Install this extension
2. Create a `.envora` file in your project
3. The icon and syntax highlighting apply automatically

```envora
# Your config file
APP {
    name: "My Application"
    debug: true
}

SERVER {
    host: "localhost"
    port: 3000
}

DATABASE {
    password: secret(env("DATABASE_PASSWORD"))
}
```

## Activating the file icon

After installing, if the Envora icon does not show up:

1. Open **Command Palette** (`Ctrl+Shift+P`)
2. Type `File Icon Theme`
3. Select **Envora File Icons**

## Related

- [envora](https://www.npmjs.com/package/envora) — the npm package
- [GitHub](https://github.com/envora/envora)

## License

MIT
