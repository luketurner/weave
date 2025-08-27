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
  useOnMouseHover,
  useMouse,
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
  const [hovering, setHovering] = useState(false);
  useOnMouseHover(ref as RefObject<DOMElement>, (isHovering) => {
    setHovering(isHovering);
  });
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
  const [tailMode, setTailMode] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const mouse = useMouse();
  const isNarrow = numColumns < 80;

  // TODO -- wish this wasn't hardcoded.
  // The 4 is the sum of non-log-line UI elements in the output.
  // Specifically we have:
  //  - 2 lines for border
  //  - 1 line for filtering / cmd line
  //  - 1 line for the empty line at the bottom of the terminal
  //  - if isNarrow, the filtering/cmd line is two high instead
  const numLogLines = numRows - 4 - (isNarrow ? 1 : 0);
  // For this we have:
  //  - 13 for timestamp + gap
  //  - 4 for label (e.g. [0]) + gap
  //  - 2 for padding
  //  - if isNarrow, timestamps are hidden
  const maxLineLength = numColumns - 6 - (isNarrow ? 0 : 13);

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
        Object.assign(
          proc,
          spawnProcess(proc.config, handleLogEntry, { maxLineLength })
        );
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
    const newOffset = Math.max(scrollOffset - n, 0);
    setScrollOffset(newOffset);
    // Disable tail mode when user scrolls up
    if (newOffset < Math.max(0, filteredLogs.length - numLogLines)) {
      setTailMode(false);
    }
  };

  const scrollDown = (n: number) => {
    const maxOffset = Math.max(0, filteredLogs.length - numLogLines);
    const newOffset = Math.min(scrollOffset + n, maxOffset);
    setScrollOffset(newOffset);
    // Enable tail mode when scrolled to bottom
    if (newOffset >= maxOffset) {
      setTailMode(true);
    }
  };

  const openSaveModal = () => {
    setSaveModal(true);
  };

  const toggleHelp = () => {
    setShowHelp((prev) => !prev);
  };

  const [prevFilteredLogs, setPrevFilteredLogs] = useState(filteredLogs);
  if (prevFilteredLogs !== filteredLogs) {
    setPrevFilteredLogs(filteredLogs);
    // When filter changes, keep scroll position valid
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
      // Note -- having to pass maxLineLength in here is a hack that doesn't work when
      // the window is resized after opening. Should really be used somewhere else,
      // but the scrolling logic gets way less intuitive if we allow a single entry to
      // be more than one line.
      spawnProcess(proc, handleLogEntry, { maxLineLength })
    );

    processesRef.current = processes;
  }, [processConfigs]);

  useInput((input, key) => {
    // NOTE -- this useInput hook captures mouse inputs as well,
    // which it feels like it really shouldn't. Filtering them out
    // up front.
    if (input.startsWith("[<")) {
      return;
    }

    if (error) {
      setError("");
      return;
    }

    if (showHelp) {
      toggleHelp();
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

    if (input === "h" || input === "?") {
      setShowHelp(true);
    }

    if (input === "m") {
      mouse.toggle();
    }

    if (key.upArrow) {
      scrollUp(1);
    }

    if (key.downArrow) {
      scrollDown(1);
    }

    if (key.leftArrow) {
      setFilter((prev) =>
        prev === null || prev === 0 ? null : Math.max(prev - 1, 0)
      );
    }

    if (key.rightArrow) {
      setFilter((prev) =>
        prev === null ? 0 : Math.min(prev + 1, processConfigs.length - 1)
      );
    }
  });

  const visibleLogs = filteredLogs.slice(
    scrollOffset,
    scrollOffset + numLogLines
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

  // Auto-scroll to bottom when new logs arrive in tail mode
  useEffect(() => {
    if (tailMode) {
      const maxOffset = Math.max(0, filteredLogs.length - numLogLines);
      setScrollOffset(maxOffset);
    }
  }, [filteredLogs.length, numLogLines, tailMode]);

  return (
    <Box
      flexDirection="column"
      height={numRows - 1}
      borderStyle="double"
      borderColor="gray"
      borderLeft={false}
      borderRight={false}
      paddingX={1}
    >
      {visibleLogs.length === 0 ? (
        <Text dimColor>Waiting for output...</Text>
      ) : (
        visibleLogs.map((log) => (
          <Box columnGap={1} key={log.index}>
            {log.continuation ? (
              // don't show timestamp/etc. for continuations,
              // but maintain the same alignment with this spacer
              <Box width={3 + (isNarrow ? 0 : 13)}>
                <Spacer />
                <Text>...</Text>
              </Box>
            ) : (
              <>
                {isNarrow ? null : (
                  <Box flexShrink={0}>
                    <Text dimColor>
                      {log.timestamp.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        hour12: false,
                        minute: "2-digit",
                        second: "2-digit",
                        fractionalSecondDigits: 3,
                      })}
                    </Text>
                  </Box>
                )}
                <Box flexShrink={0}>
                  <Text color={colorForCmd(log.command) || "white"}>
                    [{log.command}]
                  </Text>
                </Box>
              </>
            )}
            <Box>
              <Text>{log.text}</Text>
            </Box>
          </Box>
        ))
      )}
      <Spacer />
      {error ? (
        isNarrow ? (
          <>
            <Box>
              <Text color="redBright">{error}</Text>
            </Box>
            <Box>
              <Text dimColor>[any key] hide error</Text>
            </Box>
          </>
        ) : (
          <Box>
            <Text color="redBright">{error}</Text>
            <Spacer />
            <Text dimColor>[any key] hide error</Text>
          </Box>
        )
      ) : showHelp ? (
        <Box>
          <Text dimColor>[↑/↓] scroll / [←/→] filter</Text>
          <Spacer />
          <Text dimColor>[any key] close help</Text>
        </Box>
      ) : saveModal ? (
        isNarrow ? (
          <>
            <Box>
              <Text>Save to file: </Text>
              <SafeUncontrolledTextInput onSubmit={handleSaveFile} />
            </Box>
            <Box>
              <Text dimColor>[ret] submit / [esc] cancel</Text>
            </Box>
          </>
        ) : (
          <Box gap={1}>
            <Text>Save to file:</Text>
            <SafeUncontrolledTextInput onSubmit={handleSaveFile} />
            <Spacer />
            <Text dimColor>[ret] submit / [esc] cancel</Text>
          </Box>
        )
      ) : (
        <>
          <Box columnGap={1} height={1} flexWrap="wrap">
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
            {isNarrow ? null : (
              <>
                <Spacer />
                {tailMode ? (
                  <>
                    <Text color="green">● live</Text>
                  </>
                ) : (
                  <>
                    <Text dimColor>
                      {Math.round((scrollOffset / filteredLogs.length) * 100)}%
                    </Text>
                  </>
                )}
                <Text dimColor>/</Text>
                <TextButton onClick={toggleHelp}>[h]elp</TextButton>
                <Text dimColor>/</Text>
                <TextButton onClick={() => mouse.toggle()}>
                  [m]ouse {mouse.status === "enabled" ? "on" : "off"}
                </TextButton>
                <Text dimColor>/</Text>
                <TextButton onClick={restartFilteredProcesses}>
                  [r]estart
                </TextButton>
                <Text dimColor>/</Text>
                <TextButton onClick={openSaveModal}>[s]ave</TextButton>
                <Text dimColor>/</Text>
                <TextButton onClick={quit}>[q]uit</TextButton>
              </>
            )}
          </Box>
          {isNarrow ? (
            <Box height={1} columnGap={1}>
              {tailMode ? (
                <>
                  <Text color="green">● live</Text>
                </>
              ) : (
                <>
                  <Text dimColor>
                    {Math.round((scrollOffset / filteredLogs.length) * 100)}%
                  </Text>
                </>
              )}
              <Spacer />
              <TextButton onClick={toggleHelp}>[h]elp</TextButton>
              <Text dimColor>/</Text>
              <TextButton onClick={() => mouse.toggle()}>
                [m]ouse {mouse.status === "enabled" ? "on" : "off"}
              </TextButton>
              <Text dimColor>/</Text>
              <TextButton onClick={restartFilteredProcesses}>
                [r]estart
              </TextButton>
              <Text dimColor>/</Text>
              <TextButton onClick={openSaveModal}>[s]ave</TextButton>
              <Text dimColor>/</Text>
              <TextButton onClick={quit}>[q]uit</TextButton>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
};
