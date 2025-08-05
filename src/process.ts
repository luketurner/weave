import { spawn } from "bun";
import type { ProcessConfig } from "./args";
import stripAnsi from "strip-ansi";
import { splitIntoChunks } from "./util";

type Stream = "stdout" | "stderr" | "system";

export interface LogEntry {
  command: number;
  text: string;
  timestamp: Date;
  stream: Stream;
  index: number;
  continuation: boolean;
}

export interface CommandProcess {
  config: ProcessConfig;
  process: ReturnType<typeof spawn>;
}

let globalLogIndex = 0;

export function spawnProcess(
  config: ProcessConfig,
  handleLogEntry: (e: LogEntry) => void,
  { maxLineLength }: { maxLineLength: number }
): CommandProcess {
  const buildEntries = (stream: Stream, fullText: string) => {
    const timestamp = new Date();
    let continuation = false;
    for (const chunk of splitIntoChunks(fullText, maxLineLength)) {
      handleLogEntry({
        command: config.id,
        text: chunk,
        timestamp,
        stream,
        index: globalLogIndex++,
        continuation,
      });
      continuation = true;
    }
  };

  const proc = spawn([config.command, ...config.args], {
    stdio: ["ignore", "pipe", "pipe"],
    onExit(_proc, exitCode) {
      buildEntries("system", `Process exited with code ${exitCode}`);
    },
  });

  buildEntries("system", [config.command, ...config.args].join(" "));

  listen(proc.stdout, (chunk) => {
    buildEntries("stdout", chunk);
  });

  listen(proc.stderr, (chunk) => {
    buildEntries("stderr", chunk);
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
