# `CLAUDE.md` - weave

## Project Context

`weave` is a CLI tool for running multiple long-running commands at once and "weaving" together the output in an attractive TUI.

## Development Best Practices

- NEVER use the `any` type to fix TypeScript errors.
- Use `bun` for all package management commands. DO NOT use `npm`.
- Commit messages should tersely explain what changed without excessive prose.
- Prefix all commit messages with "claude: "
- Use `bun run format` to format code changes.
- Use `bun run compile` to compile code changes. DO NOT use `bunx tsc`.
