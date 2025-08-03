export interface ProcessConfig {
  command: string;
  args: string[];
  id: number;
}

export interface ParsedArgs {
  processes: ProcessConfig[];
}

export function parseArgs(args: string[]): ParsedArgs {
  const processes: ProcessConfig[] = [];
  let proc = 0;
  for (const arg of args) {
    if (arg === "--") {
      proc++;
    } else {
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

  return {
    processes,
  };
}
