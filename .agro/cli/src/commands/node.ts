import { isOneOf, NODE_VERBS } from "../command-table.js";
import { resolveProjectRoot } from "../lib/project.js";
import { readSecret } from "../lib/secrets.js";

export const CONSOLE_CONFIG_MISSING =
  "set AGRO_CONSOLE_URL and AGRO_CONSOLE_TOKEN, or run agro secret set <KEY>";

export const NODE_READY_TIMEOUT_MS = 15 * 60 * 1000;
export const NODE_POLL_INTERVAL_MS = 5000;

const FAILURE_STATUSES = new Set(["failed", "error", "errored", "destroyed", "destroying", "deleted", "terminated"]);

export type ConsoleKey = "AGRO_CONSOLE_URL" | "AGRO_CONSOLE_TOKEN";

export interface ConsoleConfig {
  url: string;
  token: string;
}

export interface NodeIO {
  stdout: (s: string) => void;
  stderr: (s: string) => void;
}

export interface NodeDeps {
  fetch: typeof fetch;
  env: Record<string, string | undefined>;
  readSecret: (key: ConsoleKey) => string | undefined;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  pollIntervalMs: number;
  timeoutMs: number;
}

interface ConsoleNode {
  id: string;
  name: string | null;
  profile: string | null;
  status: string;
  ipv4: string | null;
  ssh: string | null;
}

type ApiResult = { ok: true; status: number; body: unknown } | { ok: false; status?: number; message: string };

export function resolveConsoleConfig(
  env: Record<string, string | undefined>,
  readSecret: (key: ConsoleKey) => string | undefined,
): ConsoleConfig | undefined {
  const lookup = (key: ConsoleKey): string | undefined => {
    const fromEnv = env[key]?.trim();
    if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
    return readSecret(key);
  };
  const url = lookup("AGRO_CONSOLE_URL");
  const token = lookup("AGRO_CONSOLE_TOKEN");
  if (url === undefined || token === undefined) return undefined;
  return { url: url.replace(/\/+$/, ""), token };
}

function readProjectSecret(key: ConsoleKey): string | undefined {
  try {
    return readSecret(resolveProjectRoot(), key);
  } catch {
    return undefined;
  }
}

function defaultDeps(): NodeDeps {
  return {
    fetch: (input, init) => globalThis.fetch(input, init),
    env: process.env,
    readSecret: readProjectSecret,
    sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
    now: () => Date.now(),
    pollIntervalMs: NODE_POLL_INTERVAL_MS,
    timeoutMs: NODE_READY_TIMEOUT_MS,
  };
}

export function nodeHelp(bin: string): string {
  return `${bin} node — Create, list, and delete agro-console sandbox nodes (remote VMs)

Usage:
  ${bin} node create --spec <spec> --ssh-key <uuid> [--ssh-key <uuid>] [--name <name>] [--json]
  ${bin} node list [--json]
  ${bin} node delete <id> [--yes]

\`create\` waits up to 15 minutes for the node to reach \`running\`, then prints
its SSH command. The verbs read AGRO_CONSOLE_URL and AGRO_CONSOLE_TOKEN from the
environment, then from the project .env (\`${bin} secret set <KEY>\`).
`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value !== "") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function toNode(value: unknown): ConsoleNode | undefined {
  const outer = asRecord(value);
  const record = asRecord(outer?.node) ?? outer;
  const id = asText(record?.id);
  if (record === undefined || id === null) return undefined;
  return {
    id,
    name: asText(record.name),
    profile: asText(record.profile),
    status: asText(record.status) ?? "unknown",
    ipv4: asText(record.ipv4),
    ssh: asText(record.ssh),
  };
}

function sshCommand(node: ConsoleNode): string | null {
  if (node.ssh !== null) return node.ssh;
  return node.ipv4 === null ? null : `ssh sandbox@${node.ipv4}`;
}

function errorDetail(status: number, body: unknown): string {
  const record = asRecord(body);
  const nested = asRecord(record?.error);
  const code = asText(record?.code) ?? asText(nested?.code) ?? "no code";
  const message = asText(record?.error) ?? asText(nested?.message) ?? asText(record?.message);
  return `HTTP ${status} ${code}${message === null ? "" : `: ${message}`}`;
}

async function callApi(
  deps: NodeDeps,
  config: ConsoleConfig,
  method: string,
  path: string,
  payload?: unknown,
): Promise<ApiResult> {
  let response: Response;
  try {
    response = await deps.fetch(`${config.url}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json",
        ...(payload === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
  } catch (error) {
    return { ok: false, message: `request failed: ${error instanceof Error ? error.message : String(error)}` };
  }
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text === "" ? null : JSON.parse(text);
  } catch {
    body = null;
  }
  if (response.status >= 400) {
    return { ok: false, status: response.status, message: errorDetail(response.status, body) };
  }
  return { ok: true, status: response.status, body };
}

interface CreateArgs {
  spec?: string;
  sshKeyIds: string[];
  name?: string;
  json: boolean;
}

function parseCreate(tokens: string[]): { ok: true; args: CreateArgs } | { ok: false; error: string } {
  const args: CreateArgs = { sshKeyIds: [], json: false };
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--json") {
      args.json = true;
      continue;
    }
    const [flag, inline] = token.startsWith("--") && token.includes("=")
      ? [token.slice(0, token.indexOf("=")), token.slice(token.indexOf("=") + 1)]
      : [token, undefined];
    if (flag !== "--spec" && flag !== "--ssh-key" && flag !== "--name") {
      return { ok: false, error: token.startsWith("-") ? `unknown flag "${token}"` : `unexpected argument "${token}"` };
    }
    const value = inline ?? tokens[++i];
    if (value === undefined || value === "") return { ok: false, error: `${flag} requires a value` };
    if (flag === "--spec") args.spec = value;
    else if (flag === "--name") args.name = value;
    else args.sshKeyIds.push(value);
  }
  if (args.spec === undefined) return { ok: false, error: "--spec is required" };
  if (args.sshKeyIds.length === 0) return { ok: false, error: "at least one --ssh-key is required" };
  return { ok: true, args };
}

function printCreateResult(io: NodeIO, node: ConsoleNode, json: boolean): void {
  const ssh = node.status === "running" ? sshCommand(node) : null;
  if (json) {
    io.stdout(`${JSON.stringify({ id: node.id, status: node.status, ssh })}\n`);
    return;
  }
  io.stdout(`id: ${node.id}\nstatus: ${node.status}\n${ssh === null ? "" : `${ssh}\n`}`);
}

async function runCreate(
  tokens: string[],
  io: NodeIO,
  deps: NodeDeps,
  config: ConsoleConfig,
  bin: string,
): Promise<number> {
  const prefix = `${bin} node create`;
  const parsed = parseCreate(tokens);
  if (!parsed.ok) {
    io.stderr(`${prefix}: ${parsed.error}\n`);
    return 1;
  }
  const { spec, sshKeyIds, name, json } = parsed.args;
  const created = await callApi(deps, config, "POST", "/api/nodes", {
    profile: "sandbox",
    spec,
    sshKeyIds,
    ...(name === undefined ? {} : { name }),
  });
  if (!created.ok) {
    io.stderr(`${prefix}: ${created.message}\n`);
    return 1;
  }
  let node = toNode(created.body);
  if (node === undefined) {
    io.stderr(`${prefix}: the console response has no node id\n`);
    return 1;
  }
  io.stderr(`${prefix}: node ${node.id} ${node.status}\n`);
  const deadline = deps.now() + deps.timeoutMs;
  while (node.status !== "running" && !FAILURE_STATUSES.has(node.status)) {
    const remaining = deadline - deps.now();
    if (remaining <= 0) {
      printCreateResult(io, node, json);
      io.stderr(`${prefix}: node ${node.id} is not running after 15 minutes — last status ${node.status}\n`);
      return 1;
    }
    await deps.sleep(Math.min(deps.pollIntervalMs, remaining));
    const polled = await callApi(deps, config, "GET", `/api/nodes/${encodeURIComponent(node.id)}`);
    if (!polled.ok) {
      io.stderr(`${prefix}: node ${node.id}: ${polled.message}\n`);
      return 1;
    }
    const previous = node.status;
    node = toNode(polled.body) ?? { ...node, status: "unknown" };
    if (node.status !== previous) io.stderr(`${prefix}: node ${node.id} ${node.status}\n`);
  }
  printCreateResult(io, node, json);
  if (node.status !== "running") {
    io.stderr(`${prefix}: node ${node.id} failed — last status ${node.status}\n`);
    return 1;
  }
  return 0;
}

export async function runNode(
  args: string[],
  io: NodeIO,
  overrides: Partial<NodeDeps> = {},
  bin = "agro",
): Promise<number> {
  const [verb, ...rest] = args;
  if (verb === undefined || verb === "--help" || verb === "-h" || verb === "help") {
    io.stdout(nodeHelp(bin));
    return verb === undefined ? 1 : 0;
  }
  if (!isOneOf(NODE_VERBS, verb)) {
    io.stderr(`${bin} node: unknown subcommand "${verb}" — expected ${NODE_VERBS.join(", ")}\n`);
    return 1;
  }
  if (rest.some((token) => token === "--help" || token === "-h")) {
    io.stdout(nodeHelp(bin));
    return 0;
  }
  const deps = { ...defaultDeps(), ...overrides };
  const config = resolveConsoleConfig(deps.env, deps.readSecret);
  if (config === undefined) {
    io.stderr(`${bin} node ${verb}: ${CONSOLE_CONFIG_MISSING}\n`);
    return 1;
  }
  return runCreate(rest, io, deps, config, bin);
}
