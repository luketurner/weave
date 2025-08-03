import { spawn } from "bun";
import type { ProcessConfig } from "./args";
import stripAnsi from "strip-ansi";

export interface LogEntry {
  command: number;
  text: string;
  timestamp: Date;
  stream: "stdout" | "stderr" | "system";
}

export interface CommandProcess {
  config: ProcessConfig;
  process: ReturnType<typeof spawn>;
}

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
      });
    },
  });

  listen(proc.stdout, (chunk) => {
    handleLogEntry({
      command: config.id,
      text: chunk,
      timestamp: new Date(),
      stream: "stdout",
    });
  });

  listen(proc.stderr, (chunk) => {
    handleLogEntry({
      command: config.id,
      text: chunk,
      timestamp: new Date(),
      stream: "stderr",
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
