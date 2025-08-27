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

  return {
    processes,
    help: !!values.help,
    noMouse: !!values["no-mouse"],
  };
}
