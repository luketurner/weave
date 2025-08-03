import useStdoutDimensions from "ink-use-stdout-dimensions";
import { useApp, useInput, Box, Text, Spacer } from "ink";
import { useState, useRef, useEffect, useMemo } from "react";
import type { ProcessConfig } from "./args";
import { spawnProcess, type CommandProcess, type LogEntry } from "./process";
import { colorForCmd } from "./util";

export interface AppProps {
  processConfigs: ProcessConfig[];
}

export const App: React.FC<AppProps> = ({ processConfigs }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [filter, setFilter] = useState<number | null>(null);
  const [selectedButton, setSelectedButton] = useState(0);
  const { exit } = useApp();
  const processesRef = useRef<CommandProcess[]>([]);
  const [numColumns, numRows] = useStdoutDimensions();
  const prevSelectedButton = useRef(selectedButton);

  const handleLogEntry = (entry: LogEntry) =>
    setLogs((prev) => [...prev, entry]);

  // TODO -- wish this wasn't hardcoded.
  // The 4 is the sum of non-log-line UI elements in the output.
  // Specifically we have:
  //  - 2 lines for border
  //  - 1 line for filtering / cmd line
  //  - 1 line for the empty line at the bottom of the terminal
  const numLogLines = numRows - 4;

  const filteredLogs = useMemo(() => {
    return filter === null
      ? logs
      : logs.filter((log) => log.command === filter);
  }, [logs, filter]);

  const prevFilteredLogs = useRef(filteredLogs);

  if (prevFilteredLogs.current !== filteredLogs) {
    prevFilteredLogs.current = filteredLogs;
    setScrollOffset((prev) =>
      Math.min(prev, Math.max(0, filteredLogs.length - numLogLines))
    );
  }

  if (prevSelectedButton.current !== selectedButton) {
    prevSelectedButton.current = selectedButton;
    if (selectedButton === 0) {
      setFilter(null);
    } else {
      setFilter(selectedButton - 1);
    }
  }

  useEffect(() => {
    const processes: CommandProcess[] = processConfigs.map((proc) =>
      spawnProcess(proc, handleLogEntry)
    );

    processesRef.current = processes;
  }, [processConfigs]);

  useInput((input, key) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      processesRef.current.forEach(({ process }) => {
        process.kill();
      });
      exit();
    }

    if (input === "r") {
      processesRef.current.forEach((proc) => {
        if (!filter || proc.config.id === filter) {
          proc.process.kill();
          Object.assign(proc, spawnProcess(proc.config, handleLogEntry));
        }
      });
    }

    if (key.upArrow) {
      setScrollOffset((prev) =>
        Math.min(prev + 1, Math.max(0, filteredLogs.length - numLogLines))
      );
    }

    if (key.downArrow) {
      setScrollOffset((prev) => Math.max(prev - 1, 0));
    }

    if (key.leftArrow) {
      setSelectedButton((prev) => Math.max(prev - 1, 0));
    }

    if (key.rightArrow) {
      setSelectedButton((prev) => Math.min(prev + 1, processConfigs.length));
    }
  });

  const visibleLogs = filteredLogs.slice(
    Math.max(0, filteredLogs.length - numLogLines - scrollOffset),
    filteredLogs.length - scrollOffset
  );

  return (
    <Box
      flexDirection="column"
      height={numRows - 1}
      borderStyle="single"
      borderColor="gray"
    >
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {visibleLogs.length === 0 ? (
          <Text dimColor>Waiting for output...</Text>
        ) : (
          visibleLogs.map((log, index) => (
            <Box key={index}>
              <Text color={colorForCmd(log.command) || "white"}>
                [{log.command}]
              </Text>
              <Text> {log.text}</Text>
            </Box>
          ))
        )}
        <Spacer />
        <Box gap={1}>
          <Box>
            <Text inverse={selectedButton === 0} bold={filter === null}>
              All
            </Text>
          </Box>
          {processConfigs.map((cmd) => (
            <Box key={cmd.id}>
              <Text
                inverse={selectedButton === cmd.id + 1}
                bold={filter === cmd.id}
                color={colorForCmd(cmd.id)}
              >
                [{cmd.id}] {cmd.command.substring(0, 10)}
              </Text>
            </Box>
          ))}
          <Spacer />
          <Text dimColor>
            [↑/↓] scroll, [←/→] filter, [q] quit, [r] restart proc(s)
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
