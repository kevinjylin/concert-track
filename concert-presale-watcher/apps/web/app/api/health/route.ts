import { NextResponse } from "next/server";
import { env, hasSupabaseAuthConfig, hasSupabaseConfig } from "../../../lib/env";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (
    !env.internalHealthSecret ||
    request.headers.get("Authorization") !== `Bearer ${env.internalHealthSecret}`
  ) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({
    ok: true,
    databaseConfigured: hasSupabaseConfig(),
    sourceKeysConfigured: {
      ticketmaster: Boolean(env.ticketmasterApiKey),
      eventbrite: Boolean(env.eventbriteToken),
      spotify: Boolean(env.spotifyClientId && env.spotifyClientSecret),
    },
    authConfigured: {
      supabase: hasSupabaseAuthConfig(),
    },
    alertChannelsConfigured: {
      discord: true,
      email: Boolean(env.resendApiKey && env.alertFromEmail),
      sms: Boolean(
        env.twilioAccountSid && env.twilioAuthToken && env.twilioFromPhone,
      ),
    },
  });
}
