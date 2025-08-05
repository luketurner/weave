#!/usr/bin/env bun

const loremIpsumLines = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.",
  "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui.",
  "Officia deserunt mollit anim id est laborum.",
  "Curabitur pretium tincidunt lacus nulla gravida orci a odio sit.",
  "Aliquam vestibulum morbi blandit cursus risus at ultrices mi tempus.",
  "Imperdiet duis convallis convallis tellus id interdum velit laoreet.",
  "Sed adipiscing diam donec adipiscing tristique risus nec feugiat in.",
  "",
];

if (process.argv[2] === "lines") {
  let index = 0;
  setInterval(() => {
    console.log(loremIpsumLines[index]);
    index = (index + 1) % loremIpsumLines.length;
  }, 500);
} else if (process.argv[2] === "full") {
  console.log(loremIpsumLines.join(" "));
  setInterval(() => {
    console.log(loremIpsumLines.join(" "));
  }, 5000);
}
