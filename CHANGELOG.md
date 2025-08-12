# Changelog

## 0.5.0 (2025-08-12)

- Switch deploy pipeline to use bakery 

---

## 0.4.1 (2025-08-08)

- Fixed boundary conditions for using left/right arrows to navigate filters
- "Fix" spacing issue with emoji + borders (https://github.com/vadimdemedes/ink/issues/733) by removing left/right borders.

---

## 0.4.0 (2025-08-06)

Breaking change:

- Adjusted separator for commands in CLI to be `---` instead of `--`. This fixes some issues with automatic handling of `--` in Bun.

New features / UI changes:

- Added `--help`/`-h` flag.
- Added "narrow mode" that renders things differently if the terminal is <80 characters.
- Remove manual show/hide timestamp toggle. Timestamps are now shown by default, and hidden by default in narrow mode.
- Removed scroll/filter help text from status bar. Added a [h]elp command to display them instead.
- Added percentage indicator for scroll offset.

---

## 0.3.0 (2025-08-05)

- Implement "tail mode" so the user can either view live logs as they come in, or look at logs in the scrollback buffer without them moving around.

---

## 0.2.1 (2025-08-05)

- Explicitly handle lines that are longer than the max width of the display window.
- Fix edge case around strings containing only a single newline

---

## 0.2.0 (2025-08-04)

- Add mouse support (UI elements are clickable, logs can be scrolled with scroll wheel)
- Add timestamps (toggleable, on by default)
- some minor UI enhancements

---

## 0.1.3 (2025-08-03)

- fix broken import

---

## 0.1.2 (2025-08-03)

- Vendor the ink-use-stdout-dimensions dependency, since the bun patch approach breaks when weave is itself installed as a package.

---

## 0.1.1 (2025-08-03)

- add package tarball to release files

---

## 0.1.0 (2025-08-03)

- Initial release of `weave`

---
