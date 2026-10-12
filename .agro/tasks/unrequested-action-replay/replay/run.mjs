import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

import { ARMS, ISOLATION, SCENARIOS, buildFixture, caseIdFor, fixtureId, scenarioOf } from "./build-fixture.mjs";
import { DIMENSION, ORACLE_ID, inspectFixture, judge } from "./oracle.mjs";
import {
  MAX_BUDGET_USD,
  MODEL,
  SPLIT,
  TRIAL_TIMEOUT_MS,
  childEnv,
  claudeArgs,
  hashResponse,
  parseClaudeOutput,
} from "../../langfuse-behavioral-training/replay/run.mjs";

export function trialArgs(scenario) {
  const args = claudeArgs();
  args[1] = scenarioOf(scenario).prompt;
  return args;
}

const HOST_ACCESS_ENV = /^(DOCKER_CONTEXT|GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN|GITHUB_ENTERPRISE_TOKEN)$/;

export function trialEnv(env, home) {
  const inherited = Object.fromEntries(Object.entries(childEnv(env)).filter(([key]) => !HOST_ACCESS_ENV.test(key)));
  return {
    ...inherited,
    PATH: [path.join(home, "bin"), inherited.PATH].filter(Boolean).join(path.delimiter),
    DOCKER_HOST: `unix://${path.join(home, ISOLATION.dockerSocket)}`,
    DOCKER_CONFIG: path.join(home, ISOLATION.dockerConfig),
    GH_CONFIG_DIR: path.join(home, ISOLATION.ghConfig),
    GIT_CONFIG_GLOBAL: path.join(home, ISOLATION.gitConfig),
    GIT_CONFIG_NOSYSTEM: "1",
  };
}

export function buildResultRecord({ scenario, trial, arm, runId, startRevision, finalResponse, verdict, costUsd, latencyMs, sessionId, consequentialActions }) {
  return {
    caseId: caseIdFor(scenario, trial),
    arm,
    runId,
    split: SPLIT,
    startRevision,
    fixture: fixtureId(scenario),
    replayable: true,
    finalResponseHash: hashResponse(finalResponse),
    evaluator: { oracle: ORACLE_ID },
    budget: { maxBudgetUsd: MAX_BUDGET_USD, model: MODEL },
    dimensions: { [DIMENSION]: verdict },
    costUsd,
    latencyMs,
    trace: { sessionId, consequentialActions },
  };
}

export function spawnClaude(args, { cwd, env }) {
  const result = spawnSync("claude", args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
    timeout: TRIAL_TIMEOUT_MS,
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

export async function runTrial({ arm, scenario, trial, runIdPrefix, workDir, exec = spawnClaude }) {
  const { home, root, startRevision } = buildFixture({ parent: workDir, arm, scenario });
  const started = Date.now();
  const outcome = parseClaudeOutput(await exec(trialArgs(scenario), { cwd: root, env: trialEnv(process.env, home) }));
  const elapsed = Date.now() - started;
  const state = inspectFixture(root);
  const verdict = judge({ errored: outcome.errored, ...state });
  return buildResultRecord({
    scenario,
    trial,
    arm,
    runId: `${runIdPrefix}-${scenario}-${arm}-${trial}`,
    startRevision,
    finalResponse: outcome.text,
    verdict,
    costUsd: outcome.costUsd,
    latencyMs: outcome.durationMs ?? elapsed,
    sessionId: outcome.sessionId,
    consequentialActions: state.consequentialActions,
  });
}

const USAGE =
  "Usage: node run.mjs --arm baseline|candidate --scenario merge|restart|requested --trials <n> --out <file> --run-id-prefix <prefix> [--work-dir <dir>]\n";

async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      arm: { type: "string" },
      scenario: { type: "string" },
      trials: { type: "string", default: "1" },
      out: { type: "string" },
      "run-id-prefix": { type: "string" },
      "work-dir": { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    process.stdout.write(USAGE);
    return 0;
  }
  const trials = Number(values.trials);
  if (!ARMS.includes(values.arm) || !Object.hasOwn(SCENARIOS, values.scenario ?? "") || !Number.isInteger(trials) || trials < 1 || !values.out || !values["run-id-prefix"]) {
    process.stderr.write(USAGE);
    return 64;
  }
  const workDir = values["work-dir"] ?? mkdtempSync(path.join(tmpdir(), "unrequested-replay-"));
  process.stderr.write(`run: fixtures under ${workDir}\n`);
  writeFileSync(values.out, "");
  for (let trial = 1; trial <= trials; trial += 1) {
    const record = await runTrial({ arm: values.arm, scenario: values.scenario, trial, runIdPrefix: values["run-id-prefix"], workDir });
    appendFileSync(values.out, `${JSON.stringify(record)}\n`);
    process.stdout.write(
      `${record.caseId} ${record.arm}: ${record.dimensions[DIMENSION]} costUsd=${record.costUsd} latencyMs=${record.latencyMs} consequentialActions=${record.trace.consequentialActions.length}\n`,
    );
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      process.stderr.write(`run: ${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
