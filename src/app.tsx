import {
  useApp,
  useInput,
  Box,
  Text,
  Spacer,
  type DOMElement,
  type TextProps,
} from "ink";
import { useState, useRef, useEffect, useMemo, type RefObject } from "react";
import type { ProcessConfig } from "./args";
import { spawnProcess, type CommandProcess, type LogEntry } from "./process";
import { colorForCmd } from "./util";
import TextInput, { type Props } from "ink-text-input";
import { useStdoutDimensions } from "./useStdoutDimensions";
import {
  useMouseAction,
  useOnMouseClick,
  useOnMouseState,
} from "ink-mouse-alt";
import stripAnsi from "strip-ansi";

export interface AppProps {
  processConfigs: ProcessConfig[];
}

interface TextButtonProps extends TextProps {
  onClick: () => void;
}

function TextButton({ onClick, ...props }: TextButtonProps) {
  const ref = useRef<DOMElement>(null);
  const { hovering } = useOnMouseState(ref as RefObject<DOMElement>);
  useOnMouseClick(ref as RefObject<DOMElement>, (isClicking) => {
    if (isClicking) onClick();
  });

  return (
    <Box ref={ref}>
      <Text underline={hovering} {...props}></Text>
    </Box>
  );
}

function SafeUncontrolledTextInput(props: Omit<Props, "value" | "onChange">) {
  const [value, setValue] = useState("");
  return (
    <TextInput
      value={value}
      // Note -- it seems stripAnsi isn't stripping mouse escape sequences like [<35;101;11m
      // so we strip them ourselves with this janky regex
      onChange={(v) =>
        setValue(stripAnsi(v).replace(/\[<\d+;\d+;\d+[mM]/g, ""))
      }
      {...props}
    />
  );
}

export const App: React.FC<AppProps> = ({ processConfigs }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [filter, setFilter] = useState<number | null>(null);
  const [saveModal, setSaveModal] = useState(false);
  const { exit } = useApp();
  const processesRef = useRef<CommandProcess[]>([]);
  const [numColumns, numRows] = useStdoutDimensions();
  const [error, setError] = useState("");
  const errorTimeout = useRef<NodeJS.Timeout | null>(null);
  const mouseAction = useMouseAction();
  const [scrollDelay, setScrollDelay] = useState(0);
  const [showTimestamps, setShowTimestamps] = useState(true);

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

  const restartFilteredProcesses = () => {
    processesRef.current.forEach((proc) => {
      if (!filter || proc.config.id === filter) {
        proc.process.kill();
        Object.assign(proc, spawnProcess(proc.config, handleLogEntry));
      }
    });
  };

  const quit = () => {
    processesRef.current.forEach(({ process }) => {
      process.kill();
    });
    exit();
  };

  const scrollUp = (n: number) => {
    setScrollOffset((prev) =>
      Math.min(prev + n, Math.max(0, filteredLogs.length - numLogLines))
    );
  };

  const scrollDown = (n: number) => {
    setScrollOffset((prev) => Math.max(prev - n, 0));
  };

  const openSaveModal = () => {
    setSaveModal(true);
  };

  const toggleTimestamps = () => {
    setShowTimestamps((prev) => !prev);
  };

  const prevFilteredLogs = useRef(filteredLogs);

  // Todo -- replace with useState instead of useRef
  if (prevFilteredLogs.current !== filteredLogs) {
    prevFilteredLogs.current = filteredLogs;
    setScrollOffset((prev) =>
      Math.min(prev, Math.max(0, filteredLogs.length - numLogLines))
    );
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
      quit();
    }

    if (input === "r") {
      restartFilteredProcesses();
    }

    if (input === "s") {
      openSaveModal();
    }

    if (input === "t") {
      toggleTimestamps();
    }

    if (key.upArrow) {
      scrollUp(1);
    }

    if (key.downArrow) {
      scrollDown(1);
    }

    if (key.leftArrow) {
      setFilter((prev) => (prev === null ? null : Math.max(prev - 1, 0)));
    }

    if (key.rightArrow) {
      setFilter((prev) =>
        prev === null ? 0 : Math.min(prev + 1, processConfigs.length)
      );
    }
  });

  const visibleLogs = filteredLogs.slice(
    Math.max(0, filteredLogs.length - numLogLines - scrollOffset),
    filteredLogs.length - scrollOffset
  );

  useEffect(() => {
    if (scrollDelay > Date.now()) return;

    const linesToScroll = Math.min(5, Math.ceil(numLogLines / 2));

    if (mouseAction === "scrollup") {
      scrollUp(linesToScroll);
      setScrollDelay(Date.now() + 5);
    }

    if (mouseAction === "scrolldown") {
      scrollDown(linesToScroll);
      setScrollDelay(Date.now() + 5);
    }
  }, [mouseAction, scrollDelay, setScrollDelay, scrollUp, scrollDown]);

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
          visibleLogs.map((log) => (
            <Box gap={1} key={log.index}>
              {showTimestamps ? (
                <Text dimColor>
                  {log.timestamp.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    hour12: false,
                    minute: "2-digit",
                    second: "2-digit",
                    fractionalSecondDigits: 3,
                  })}
                </Text>
              ) : null}
              <Text color={colorForCmd(log.command) || "white"}>
                [{log.command}]
              </Text>
              <Text>{log.text}</Text>
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
            <SafeUncontrolledTextInput onSubmit={handleSaveFile} />
            <Spacer />
            <Text dimColor>[ret] submit, [esc] cancel</Text>
          </Box>
        ) : (
          <Box gap={1}>
            <Box>
              <TextButton
                inverse={filter === null}
                bold={filter === null}
                onClick={() => setFilter(null)}
              >
                All
              </TextButton>
            </Box>
            {processConfigs.map((cmd) => (
              <TextButton
                key={cmd.id}
                inverse={filter === cmd.id}
                bold={filter === cmd.id}
                color={colorForCmd(cmd.id)}
                onClick={() => setFilter(cmd.id)}
              >
                [{cmd.id}] {cmd.command.substring(0, 10)}
              </TextButton>
            ))}
            <Spacer />
            <Text dimColor>[↑/↓] scroll / [←/→] filter</Text>
            <Text dimColor>/</Text>
            <TextButton onClick={toggleTimestamps}>[t]imestamps</TextButton>
            <Text dimColor>/</Text>
            <TextButton onClick={restartFilteredProcesses}>
              [r]estart
            </TextButton>
            <Text dimColor>/</Text>
            <TextButton onClick={openSaveModal}>[s]ave logs</TextButton>
            <Text dimColor>/</Text>
            <TextButton onClick={quit}>[q]uit</TextButton>
          </Box>
        )}
      </Box>
    </Box>
  );
};
