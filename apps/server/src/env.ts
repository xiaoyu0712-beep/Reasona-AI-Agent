import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AUTH_MODE: z.enum(['local', 'google']).default('local'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_PATH: z.string().default('./data/reasona.sqlite'),
  APP_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  SESSION_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),
  MODEL_PROVIDER: z.enum(['none', 'openai-compatible']).default('none'),
  MODEL_BASE_URL: z.string().optional(),
  MODEL_API_KEY: z.string().optional(),
  MODEL_NAME: z.string().optional(),
  MODEL_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  RESEARCH_EXECUTION_ENABLED: z.enum(['true', 'false']).default('false'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional()
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = envSchema.safeParse(env);
  if (!result.success) throw new Error(`Invalid server configuration: ${result.error.issues.map(i => i.path.join('.') + ' ' + i.message).join('; ')}`);
  const config = result.data;
  if (config.NODE_ENV === 'production' && config.AUTH_MODE !== 'google') throw new Error('Production requires AUTH_MODE=google; local auth is development-only.');
  if (config.NODE_ENV === 'production' && new URL(config.APP_ORIGIN).protocol !== 'https:') throw new Error('Production requires an HTTPS APP_ORIGIN.');
  if (config.NODE_ENV === 'production' && config.COOKIE_SECURE === 'false') throw new Error('Production cookies must use Secure.');
  if (config.NODE_ENV === 'production' && (!config.SESSION_SECRET || config.SESSION_SECRET.length < 32)) throw new Error('Production requires a SESSION_SECRET of at least 32 characters.');
  if (config.AUTH_MODE === 'google' && config.NODE_ENV === 'production' && (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_REDIRECT_URI)) {
    throw new Error('Google OAuth production config is incomplete.');
  }
  if (config.NODE_ENV === 'production' && config.GOOGLE_REDIRECT_URI && new URL(config.GOOGLE_REDIRECT_URI).protocol !== 'https:') throw new Error('Production requires an HTTPS GOOGLE_REDIRECT_URI.');
  return config;
}
