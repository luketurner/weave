# weave

Weave is a TUI for running multiple long-running commands at once and "weaving together" their output.

For example, have you ever wanted to run two different dev commands at once? Like:

```bash
bun run dev        # start dev server
bun run client:dev # start client bundle watcher
```

But you have to run them in separate terminals, tmux windows, or something? Or use `&` to spin them into background processes, which doesn't have great UX?

Well, now you can just do:

```bash
weave -- bun run dev -- bun run client:dev
```

## Installation

Download the binary for your platform from the [latest release](https://github.com/luketurner/weave/releases/latest).

## Features

- Runs multiple commands at once in separate processes, and interleave their output together in a TUI window.
- Outputs in the log are prefixed with a colorized number like `[0]` to indicate which command they come from.
- Filter log output to individual processes using left/right arrow keys.
- Restart one or all processes with `r` command.
- Save output to a file with `s` command.

## Usage

```bash
# run a single command
weave -- python -m http.server

# run multiple commands simultaneously
weave -- bun run watch -- bun run client:watch -- python -m http.server
```

## Development

```bash
# run script
bun run dev

# or:
bin/weave

# deploy a new version
bun run version [VERSION]
```