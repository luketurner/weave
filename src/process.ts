import { spawn } from "bun";
import type { ProcessConfig } from "./args";
import stripAnsi from "strip-ansi";

export interface LogEntry {
  command: number;
  text: string;
  timestamp: Date;
  stream: "stdout" | "stderr" | "system";
  index: number;
}

export interface CommandProcess {
  config: ProcessConfig;
  process: ReturnType<typeof spawn>;
}

let globalLogIndex = 0;

export function spawnProcess(
  config: ProcessConfig,
  handleLogEntry: (e: LogEntry) => void
): CommandProcess {
  const proc = spawn([config.command, ...config.args], {
    stdio: ["ignore", "pipe", "pipe"],
    onExit(_proc, exitCode) {
      handleLogEntry({
        command: config.id,
        text: `Process exited with code ${exitCode}`,
        timestamp: new Date(),
        stream: "system",
        index: globalLogIndex++,
      });
    },
  });

  handleLogEntry({
    command: config.id,
    text: [config.command, ...config.args].join(" "),
    timestamp: new Date(),
    stream: "system",
    index: globalLogIndex++,
  });

  listen(proc.stdout, (chunk) => {
    handleLogEntry({
      command: config.id,
      text: chunk,
      timestamp: new Date(),
      stream: "stdout",
      index: globalLogIndex++,
    });
  });

  listen(proc.stderr, (chunk) => {
    handleLogEntry({
      command: config.id,
      text: chunk,
      timestamp: new Date(),
      stream: "stderr",
      index: globalLogIndex++,
    });
  });

  return {
    config,
    process: proc,
  };
}

async function listen(
  stream: ReadableStream<Uint8Array>,
  handler: (chunk: string) => void
) {
  const decoder = new TextDecoder("utf-8");
  for await (const chunk of stream) {
    stripAnsi(decoder.decode(chunk)).split("\n").map(handler);
  }
}
