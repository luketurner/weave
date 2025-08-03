# weave

Weave is a TUI for running multiple long-running commands at once and "weaving together" their output.

## Features

- Runs multiple commands at once in separate processes.
- View a "live tail" of the output from all the commands interleaved together, called the log.
- Outputs in the log are prefixed with a colorized number like `[0]` to indicate which command they come from.
- The TUI supports infinite scrollback within the log window.
- Includes buttons at the bottom of the window to filter the log to specific commands.

## Usage

```bash
# display help
weave --help

# run a single command
weave -- python -m http.server

# run multiple commands simultaneously
weave -- bun run watch -- bun run client:watch -- python -m http.server
```
