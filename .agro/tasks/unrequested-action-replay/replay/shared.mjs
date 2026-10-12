const entry = process.argv[1];
process.argv[1] = "";
const [guardFixture, guardRunner] = await Promise.all([
  import("../../langfuse-behavioral-training/replay/build-fixture.mjs"),
  import("../../langfuse-behavioral-training/replay/run.mjs"),
]);
process.argv[1] = entry;

export const { ARMS, DEFAULT_AGENTS, armInstructions } = guardFixture;
export const { MAX_BUDGET_USD, MODEL, SPLIT, TRIAL_TIMEOUT_MS, childEnv, claudeArgs, hashResponse, parseClaudeOutput } = guardRunner;
