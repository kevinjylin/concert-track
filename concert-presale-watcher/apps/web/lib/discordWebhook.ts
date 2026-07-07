/**
 * Validate that a string is a legitimate Discord webhook URL.
 *
 * Discord webhooks live only at well-known hostnames over HTTPS with a
 * fixed path shape. By parsing through URL (instead of regex alone) and
 * checking host/protocol/userinfo/port explicitly, we reject SSRF-style
 * payloads like `https://discord.com@evil.example/...` (the `URL` parser
 * puts `discord.com` in `username` and `evil.example` in `hostname`).
 */
const ALLOWED_DISCORD_HOSTS = new Set([
  "discord.com",
  "discordapp.com",
  "canary.discord.com",
  "ptb.discord.com",
]);

const WEBHOOK_PATH = /^\/api\/webhooks\/\d+\/[\w-]+\/?$/;

export const isValidDiscordWebhookUrl = (raw: unknown): raw is string => {
  if (typeof raw !== "string" || raw.length === 0) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") {
    return false;
  }

  // `https://discord.com@evil/...` parses with username=discord.com, host=evil.
  // Reject any URL that smuggles credentials.
  if (parsed.username !== "" || parsed.password !== "") {
    return false;
  }

  // Reject explicit ports (Discord serves only 443).
  if (parsed.port !== "") {
    return false;
  }

  if (!ALLOWED_DISCORD_HOSTS.has(parsed.hostname)) {
    return false;
  }

  return WEBHOOK_PATH.test(parsed.pathname);
};
