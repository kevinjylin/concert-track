const readEnv = (key: string): string | undefined => {
  const value = process.env[key];
  if (!value) {
    return undefined;
  }

  return value.trim();
};

export const env = {
  supabaseUrl: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  ticketmasterApiKey: readEnv("TICKETMASTER_API_KEY"),
  eventbriteToken: readEnv("EVENTBRITE_PRIVATE_TOKEN"),
  spotifyClientId: readEnv("SPOTIFY_CLIENT_ID"),
  spotifyClientSecret: readEnv("SPOTIFY_CLIENT_SECRET"),
  defaultCity: readEnv("DEFAULT_CITY"),
  pollSecret: readEnv("POLL_SECRET"),
  cronSecret: readEnv("CRON_SECRET"),
  appUrl: readEnv("APP_URL") ?? readEnv("NEXT_PUBLIC_APP_URL"),
  internalHealthSecret: readEnv("INTERNAL_HEALTH_SECRET"),
  songkickApiKey: readEnv("SONGKICK_API_KEY"),
  bandsintownAppId: readEnv("BANDSINTOWN_APP_ID"),
  eventbritePublicIngestionEnabled: readEnv("EVENTBRITE_PUBLIC_INGESTION_ENABLED") === "true",
  axsPublicIngestionEnabled: readEnv("AXS_PUBLIC_INGESTION_ENABLED") === "true",
  dicePublicIngestionEnabled: readEnv("DICE_PUBLIC_INGESTION_ENABLED") === "true",
  resendApiKey: readEnv("RESEND_API_KEY"),
  alertFromEmail: readEnv("ALERT_FROM_EMAIL"),
  alertSettingsEncryptionKey: readEnv("ALERT_SETTINGS_ENCRYPTION_KEY"),
  twilioAccountSid: readEnv("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: readEnv("TWILIO_AUTH_TOKEN"),
  twilioFromPhone: readEnv("TWILIO_FROM_PHONE"),
};

export const hasSupabaseConfig = (): boolean => {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
};

export const hasSupabaseAuthConfig = (): boolean => {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
};

export const isAuthEnabled = (): boolean => {
  return hasSupabaseAuthConfig();
};

export const assertSupabaseConfig = (): void => {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
};

export const assertSupabaseAuthConfig = (): void => {
  if (!hasSupabaseAuthConfig()) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
};
