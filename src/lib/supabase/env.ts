/** Server-side configuration. Never exposed to the browser. */
export type SupabaseEnv = { url: string; publishableKey: string };

const REQUIRED = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"] as const;

export class ConfigError extends Error {
  constructor(public missing: string[]) {
    super(`Missing environment variables: ${missing.join(", ")}`);
  }
}

export function readSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.SUPABASE_URL?.trim();
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && publishableKey ? { url, publishableKey } : null;
}

export function getSupabaseEnv(): SupabaseEnv {
  const env = readSupabaseEnv();
  if (env) return env;
  throw new ConfigError(REQUIRED.filter((name) => !process.env[name]?.trim()));
}
