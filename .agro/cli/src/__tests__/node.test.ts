import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CONSOLE_CONFIG_MISSING,
  resolveConsoleConfig,
  runNode,
  type NodeDeps,
} from "../commands/node.js";
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

interface Recorded {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

type Reply = { status: number; body?: unknown };

function harness(replies: Reply[], overrides: Partial<NodeDeps> = {}) {
  const calls: Recorded[] = [];
  const out: string[] = [];
  const err: string[] = [];
  const sleeps: number[] = [];
  let clock = 0;
  const fetchStub = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      method: init?.method ?? "GET",
      url: String(input),
      headers: { ...(init?.headers as Record<string, string>) },
      body: init?.body === undefined ? undefined : JSON.parse(String(init.body)),
    });
    const reply = replies.length > 1 ? replies.shift()! : replies[0];
    return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  const deps: Partial<NodeDeps> = {
    fetch: fetchStub,
    env: { AGRO_CONSOLE_URL: "https://console.example/", AGRO_CONSOLE_TOKEN: TOKEN },
    readSecret: () => undefined,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    pollIntervalMs: 1000,
    timeoutMs: 15 * 60 * 1000,
    ...overrides,
  };
  const io = { stdout: (s: string) => out.push(s), stderr: (s: string) => err.push(s) };
  return {
    calls,
    sleeps,
    io,
    deps,
    stdout: () => out.join(""),
    stderr: () => err.join(""),
    all: () => out.join("") + err.join(""),
  };
}

const CREATE_ARGS = ["create", "--spec", "small", "--ssh-key", "key-1", "--ssh-key", "key-2", "--name", "box"];

describe("agro node create", () => {
  it("posts a sandbox node with the bearer token and polls until running", async () => {
    const h = harness([
      { status: 202, body: { node: { id: "n1", status: "provisioning" } } },
      { status: 200, body: { id: "n1", status: "booting", ipv4: null, ssh: null } },
      { status: 200, body: { id: "n1", status: "running", ipv4: "1.2.3.4", ssh: null } },
    ]);
    const code = await runNode(CREATE_ARGS, h.io, h.deps);
    expect(code).toBe(0);
    expect(h.calls[0]).toMatchObject({
      method: "POST",
      url: "https://console.example/api/nodes",
      body: { profile: "sandbox", spec: "small", sshKeyIds: ["key-1", "key-2"], name: "box" },
    });
    expect(h.calls[0].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(h.calls.slice(1).map((c) => `${c.method} ${c.url}`)).toEqual([
      "GET https://console.example/api/nodes/n1",
      "GET https://console.example/api/nodes/n1",
    ]);
    expect(h.calls[1].headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(h.sleeps).toEqual([1000, 1000]);
    expect(h.stdout()).toContain("n1");
    expect(h.stdout()).toContain("running");
    expect(h.stdout()).toContain("ssh sandbox@1.2.3.4");
    expect(h.all()).not.toContain(TOKEN);
  });

  it("prints the ssh field from the console when present", async () => {
    const h = harness([
      { status: 202, body: { id: "n2", status: "running", ipv4: "1.2.3.4", ssh: "ssh sandbox@node.example" } },
      { status: 200, body: { id: "n2", status: "running", ipv4: "1.2.3.4", ssh: "ssh sandbox@node.example" } },
    ]);
    expect(await runNode(CREATE_ARGS, h.io, h.deps)).toBe(0);
    expect(h.stdout()).toContain("ssh sandbox@node.example");
  });

  it("exits 1 with the id and last status when the node fails", async () => {
    const h = harness([
      { status: 202, body: { id: "n3", status: "provisioning" } },
      { status: 200, body: { id: "n3", status: "failed" } },
    ]);
    expect(await runNode(CREATE_ARGS, h.io, h.deps)).toBe(1);
    expect(h.all()).toContain("n3");
    expect(h.all()).toContain("failed");
  });

  it("exits 1 with the id and last status after the time limit", async () => {
    const h = harness(
      [
        { status: 202, body: { id: "n4", status: "provisioning" } },
        { status: 200, body: { id: "n4", status: "booting" } },
      ],
      { pollIntervalMs: 60_000, timeoutMs: 15 * 60 * 1000 },
    );
    expect(await runNode(CREATE_ARGS, h.io, h.deps)).toBe(1);
    expect(h.sleeps.reduce((a, b) => a + b, 0)).toBe(15 * 60 * 1000);
    expect(h.all()).toContain("n4");
    expect(h.all()).toContain("booting");
  });

  it("prints the HTTP status and code field on an API error", async () => {
    const h = harness([{ status: 400, body: { error: "spec is invalid", code: "INVALID_SPEC" } }]);
    expect(await runNode(CREATE_ARGS, h.io, h.deps)).toBe(1);
    expect(h.stderr()).toContain("400");
    expect(h.stderr()).toContain("INVALID_SPEC");
    expect(h.calls).toHaveLength(1);
  });

  it("prints the HTTP status and code field when a poll fails", async () => {
    const h = harness([
      { status: 202, body: { id: "n5", status: "provisioning" } },
      { status: 500, body: { error: "boom", code: "INTERNAL" } },
    ]);
    expect(await runNode(CREATE_ARGS, h.io, h.deps)).toBe(1);
    expect(h.stderr()).toContain("500");
    expect(h.stderr()).toContain("INTERNAL");
  });

  it("prints one JSON object with --json", async () => {
    const h = harness([
      { status: 202, body: { id: "n6", status: "provisioning" } },
      { status: 200, body: { id: "n6", status: "running", ipv4: "5.6.7.8", ssh: null } },
    ]);
    expect(await runNode([...CREATE_ARGS, "--json"], h.io, h.deps)).toBe(0);
    expect(JSON.parse(h.stdout())).toEqual({ id: "n6", status: "running", ssh: "ssh sandbox@5.6.7.8" });
  });

  it("requires --spec and --ssh-key", async () => {
    const h = harness([{ status: 202, body: {} }]);
    expect(await runNode(["create", "--ssh-key", "k"], h.io, h.deps)).toBe(1);
    expect(await runNode(["create", "--spec", "small"], h.io, h.deps)).toBe(1);
    expect(h.calls).toHaveLength(0);
  });

  it("exits 1 with the config message when a value is missing", async () => {
    const h = harness([{ status: 202, body: {} }], { env: { AGRO_CONSOLE_TOKEN: TOKEN } });
    expect(await runNode(CREATE_ARGS, h.io, h.deps)).toBe(1);
    expect(h.stderr()).toContain(CONSOLE_CONFIG_MISSING);
    expect(h.all()).not.toContain(TOKEN);
    expect(h.calls).toHaveLength(0);
  });
});
