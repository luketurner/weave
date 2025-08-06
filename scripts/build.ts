/**
 * Builds production-ready, single-file executables in ./dist
 */
import { $ } from "bun";
import { mkdir } from "fs/promises";
import { rm } from "fs/promises";

const outdir = "dist";

const targets = [
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-linux-x64-musl",
  "bun-linux-arm64-musl",
  "bun-windows-x64",
  "bun-darwin-x64",
  "bun-darwin-arm64",
];

await rm(outdir, { recursive: true, force: true });

if (targets.includes(process.argv[2]!)) {
  await buildTarget(process.argv[2]!);
} else {
  await Promise.all(targets.map(buildTarget));
}

await $`bun pm pack --filename ${outdir}/weave-pkg.tar.gz`;

async function buildTarget(target: string) {
  const filename = `weave-${target.replace("bun-", "")}`;
  console.log(`Building ${target} into ${outdir}/${filename}...`);
  await $`bun build --define RELEASE=true --compile --minify --sourcemap src/index.tsx --outfile ${outdir}/${filename} --target ${target}`.env(
    {
      NODE_ENV: "production",
    },
  );
  if (target === "bun-windows-x64") {
    await $`chmod u+r ${filename}.exe`.cwd(outdir);
    // since zip doesn't have a --transform equivalent, just use a subdirectory and rename
    await mkdir(`${outdir}/${filename}`);
    await $`cp ${filename}.exe ${filename}/weave.exe`.cwd(outdir);
    await $`zip -9 ../${filename}.zip weave.exe`.cwd(`${outdir}/${filename}`);
    await rm(`${outdir}/${filename}`, { recursive: true });
  } else {
    await $`tar -czf ${filename}.tar.gz --transform='s/${filename}/weave/' ${filename}`.cwd(
      outdir,
    );
  }
}
