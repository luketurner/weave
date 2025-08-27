#!/usr/bin/env bun
import { render } from "ink";
import { parseArgs } from "./args";
import { App } from "./app";
import { MouseProvider } from "ink-mouse-alt";
import chalk from "chalk";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`${chalk.bold(chalk.green("weave"))} is a TUI for running multiple commands at once and monitoring their output.
    
${chalk.bold("Usage: weave [...args] --- [cmd] [...args] --- [cmd] [...args]")}

${chalk.bold("Flags:")}
  ${chalk.blue("-h, --help")}       Display help text and exit.
  ${chalk.blue("-M, --no-mouse")}   Disable mouse support.

${chalk.bold("Examples:")}
  ${chalk.dim("Display help")}
  weave --help

  ${chalk.dim("Run a single command")}
  weave --- tail -f logfile.txt

  ${chalk.dim("Run multiple commands")}
  weave --- bun run watch --- python -m http.server

${chalk.bold(`For more information, see ${chalk.underline("https://github.com/luketurner/weave")}`)}
`);
  process.exit(0);
}

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
