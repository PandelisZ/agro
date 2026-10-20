import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const DOUBLED_DEFAULT = /\$\{([A-Za-z_][A-Za-z0-9_]*):-\$\{\1:-/;
const CONTRADICTORY_DIRECTORY_TEST = /\[ ! -d "([^"]+)" \] && \[ -d "\1" \]/;

function trackedShellFiles(): string[] {
  return execFileSync("git", ["ls-files", "*.sh"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean);
}

function findings(pattern: RegExp): string[] {
  return trackedShellFiles().flatMap((file) =>
    readFileSync(join(root, file), "utf8")
      .split("\n")
      .flatMap((content, index) => (pattern.test(content) ? [`${file}:${index + 1}`] : [])),
  );
}

describe("tracked shell files", () => {
  it("write each parameter default one time", () => {
    expect(findings(DOUBLED_DEFAULT)).toEqual([]);
  });

  it("test each directory without a contradiction", () => {
    expect(findings(CONTRADICTORY_DIRECTORY_TEST)).toEqual([]);
  });
});
