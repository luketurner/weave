#!/usr/bin/env bun
import { render } from "ink";
import { parseArgs } from "./args";
import { App } from "./app";

const args = parseArgs(process.argv.slice(2));

render(<App processConfigs={args.processes} />, {
  exitOnCtrlC: false,
});
