import chalk from "chalk";
import { parseArgs as parseArgsNode } from "util";

export interface ProcessConfig {
  command: string;
  args: string[];
  id: number;
}

export interface ParsedArgs {
  processes: ProcessConfig[];
  help: boolean;
  noMouse: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
  const processes: ProcessConfig[] = [];
  let proc = 0;
  let isWeaveArg = true;
  let weaveArgs: string[] = [];
  for (const arg of args) {
    if (arg === "---") {
      if (isWeaveArg) {
        isWeaveArg = false;
      } else {
        proc++;
      }
    } else {
      if (isWeaveArg) {
        weaveArgs.push(arg);
        continue;
      }
      if (processes[proc]) {
        processes[proc]!.args.push(arg);
      } else {
        processes[proc] = {
          id: proc,
          command: arg,
          args: [],
        };
      }
    }
  }

  try {
    const { values, positionals } = parseArgsNode({
      args: weaveArgs,
      options: {
        help: {
          type: "boolean",
          short: "h",
        },
        "no-mouse": {
          type: "boolean",
          short: "M",
        },
      },
    });

    if (values.help) {
      showHelp();
      process.exit(0);
    }

    return {
      processes,
      help: !!values.help,
      noMouse: !!values["no-mouse"],
    };
  } catch (e) {
    console.log((e as Error).message);
    process.exit(1);
  }
}

function showHelp() {
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
}
