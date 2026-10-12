export const CONSOLE_CONFIG_MISSING =
  "set AGRO_CONSOLE_URL and AGRO_CONSOLE_TOKEN, or run agro secret set <KEY>";

export type ConsoleKey = "AGRO_CONSOLE_URL" | "AGRO_CONSOLE_TOKEN";

export interface ConsoleConfig {
  url: string;
  token: string;
}

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
