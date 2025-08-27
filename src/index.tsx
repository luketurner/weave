#!/usr/bin/env bun
import { render } from "ink";
import { parseArgs } from "./args";
import { App } from "./app";
import { MouseProvider } from "ink-mouse-alt";

const args = parseArgs(process.argv.slice(2));

const Root = () => {
  return (
    <MouseProvider>
      <App processConfigs={args.processes} noMouse={args.noMouse} />
    </MouseProvider>
  );
};

render(<Root />, {
  exitOnCtrlC: false,
});
