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
  const numLogLines = numRows - 4; // TODO -- wish this wasn't hardcoded

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

  useEffect(() => {
    const processes: CommandProcess[] = processConfigs.map((proc) =>
      spawnProcess(proc, (entry) => setLogs((prev) => [...prev, entry]))
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

    if (key.return || input === " ") {
      if (selectedButton === 0) {
        setFilter(null);
      } else {
        setFilter(selectedButton - 1);
      }
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
                [{cmd.id}] {cmd.command.substring(0, 20)}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
