import useStdoutDimensions from "ink-use-stdout-dimensions";
import { useApp, useInput, Box, Text, Spacer } from "ink";
import { useState, useRef, useEffect, useMemo } from "react";
import type { ProcessConfig } from "./args";
import { spawnProcess, type CommandProcess, type LogEntry } from "./process";
import { colorForCmd } from "./util";
import { UncontrolledTextInput } from "ink-text-input";

export interface AppProps {
  processConfigs: ProcessConfig[];
}

export const App: React.FC<AppProps> = ({ processConfigs }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [filter, setFilter] = useState<number | null>(null);
  const [selectedButton, setSelectedButton] = useState(0);
  const [saveModal, setSaveModal] = useState(false);
  const { exit } = useApp();
  const processesRef = useRef<CommandProcess[]>([]);
  const [numColumns, numRows] = useStdoutDimensions();
  const [error, setError] = useState("");
  const prevSelectedButton = useRef(selectedButton);
  const errorTimeout = useRef<NodeJS.Timeout | null>(null);

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

  const handleSaveFile = async (filename: string) => {
    if (filename) {
      try {
        await Bun.write(filename, filteredLogs.map((l) => l.text).join("\n"));
      } catch (e) {
        setError((e as Error).message);
      }
    } else {
      setError("Must specify a filename");
    }

    setSaveModal(false);
  };

  const handleLogEntry = (entry: LogEntry) =>
    setLogs((prev) => [...prev, entry]);

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
    if (error) {
      if (errorTimeout.current) {
        clearTimeout(errorTimeout.current);
      }
      errorTimeout.current = setInterval(() => setError(""), 5000);
    }
  }, [error, setError]);

  useEffect(() => {
    const processes: CommandProcess[] = processConfigs.map((proc) =>
      spawnProcess(proc, handleLogEntry)
    );

    processesRef.current = processes;
  }, [processConfigs]);

  useInput((input, key) => {
    if (error) {
      setError("");
      return;
    }

    if (saveModal) {
      if (key.escape) {
        setSaveModal(false);
      }
      return;
    }

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

    if (input === "s") {
      setSaveModal(true);
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
        {error ? (
          <Box>
            <Text color="redBright">{error}</Text>
            <Spacer />
            <Text dimColor>[any key] hide error</Text>
          </Box>
        ) : saveModal ? (
          <Box gap={1}>
            <Text>Save to file:</Text>
            <UncontrolledTextInput onSubmit={handleSaveFile} />
            <Spacer />
            <Text dimColor>[ret] submit, [esc] cancel</Text>
          </Box>
        ) : (
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
        )}
      </Box>
    </Box>
  );
};
