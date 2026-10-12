import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONSOLE_CONFIG_MISSING, resolveConsoleConfig } from "../commands/node.js";
import { COMPOSE_SECRET_KEYS, readSecret, SECRET_KEYS } from "../lib/secrets.js";

const TOKEN = "mfc_secret_token_value";

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length > 0) rmSync(cleanups.pop()!, { recursive: true, force: true });
});

function projectWithEnv(content: string): string {
  const root = mkdtempSync(join(tmpdir(), "agro-node-"));
  cleanups.push(root);
  mkdirSync(join(root, ".agro"), { recursive: true });
  writeFileSync(join(root, ".env"), content);
  return root;
}

describe("console config resolution", () => {
  it("registers the console keys as secrets that Compose never passes", () => {
    expect(SECRET_KEYS).toContain("AGRO_CONSOLE_URL");
    expect(SECRET_KEYS).toContain("AGRO_CONSOLE_TOKEN");
    expect(COMPOSE_SECRET_KEYS as readonly string[]).not.toContain("AGRO_CONSOLE_URL");
    expect(COMPOSE_SECRET_KEYS as readonly string[]).not.toContain("AGRO_CONSOLE_TOKEN");
  });

  it("prefers the environment over the .env fallback", () => {
    const root = projectWithEnv("AGRO_CONSOLE_URL=https://file.example\nAGRO_CONSOLE_TOKEN=mfc_file\n");
    const config = resolveConsoleConfig(
      { AGRO_CONSOLE_URL: "https://env.example/", AGRO_CONSOLE_TOKEN: TOKEN },
      (key) => readSecret(root, key),
    );
    expect(config).toEqual({ url: "https://env.example", token: TOKEN });
  });

  it("falls back to the project .env through readSecret", () => {
    const root = projectWithEnv("AGRO_CONSOLE_URL=https://file.example\nAGRO_CONSOLE_TOKEN=mfc_file\n");
    const config = resolveConsoleConfig({ AGRO_CONSOLE_URL: "" }, (key) => readSecret(root, key));
    expect(config).toEqual({ url: "https://file.example", token: "mfc_file" });
  });

  it("returns undefined when either value is missing", () => {
    const root = projectWithEnv("AGRO_CONSOLE_URL=https://file.example\n");
    expect(resolveConsoleConfig({}, (key) => readSecret(root, key))).toBeUndefined();
    expect(resolveConsoleConfig({ AGRO_CONSOLE_TOKEN: TOKEN }, () => undefined)).toBeUndefined();
    expect(CONSOLE_CONFIG_MISSING).toBe("set AGRO_CONSOLE_URL and AGRO_CONSOLE_TOKEN, or run agro secret set <KEY>");
  });
});
