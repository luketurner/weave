# weave

![weave demo](./docs/weave.gif)

Weave is a TUI for running multiple long-running commands at once and "weaving together" their output.

For example, have you ever wanted to run two different dev commands at once? Like:

```bash
bun run dev        # start dev server
bun run client:dev # start client bundle watcher
```

But you have to run them in separate terminals, tmux windows, or something? Or use `&` to spin them into background processes, which doesn't have great UX?

Well, now you can just do:

```bash
weave --- bun run dev --- bun run client:dev
```

## Installation

Three options for installation:

1. Download the binary for your platform from the [latest release](https://github.com/luketurner/weave/releases/latest).
2. Use `bun` to install it (note this won't work with node/npm):

```bash
bun add -g @luketurner/weave
```

3. If you are using `weave` in your package.json scripts, I recommend installing it as a local dependency of the package instead:

```bash
bun add --dev @luketurner/weave
```

## Features

- Runs multiple commands at once in separate processes, and interleave their output together in a TUI window.
- Outputs in the log are prefixed with a colorized number like `[0]` to indicate which command they come from.
- Unlimited scrollback buffer (well, until you run out of memory!)
- Scroll through logs with arrow keys or your mouse wheel.
- Filter log output to individual processes.
- Restart one or all processes.
- Save output to a file.
- Works with both keyboard-driven and mouse-driven workflow -- all buttons are clickable as well as having a keybind.

> [!WARNING]
> Mouse support doesn't work on Windows.

## Usage

```bash
# help
weave --help

# run a single command
weave --- python -m http.server

# run multiple commands simultaneously
weave --- bun run watch --- bun run client:watch --- python -m http.server
```

## Known issues

See https://github.com/luketurner/weave/issues

## Development

Clone this repository, then run:

```bash
bun install
```

Common commands:

```bash
# run script
bun run dev

# or:
bin/weave

# compile/format
bun run compile
bun run format

# release a new version
bun run bakery version [VERSION]
```
