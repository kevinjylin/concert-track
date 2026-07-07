import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((value) => value || undefined);

export const uuidSchema = z.string().uuid();

export const watchRuleSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("artist"),
    label: z.string().trim().min(2).max(120),
    spotifyId: optionalText(80),
    city: optionalText(120),
    state: optionalText(80),
    country: z.string().trim().length(2).default("US"),
  }),
  z.object({
    kind: z.literal("venue"),
    label: z.string().trim().min(2).max(160),
    city: optionalText(120),
    state: optionalText(80),
    country: z.string().trim().length(2).default("US"),
  }),
  z.object({
    kind: z.literal("location"),
    label: z.string().trim().min(2).max(160),
    city: optionalText(120),
    state: optionalText(80),
    country: z.string().trim().length(2).default("US"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    radiusMiles: z.number().int().min(1).max(500).default(50),
  }),
]);

export const legacyWatchArtistSchema = z.object({
  name: z.string().trim().min(2).max(120),
  spotifyId: optionalText(80),
  city: optionalText(120),
  state: optionalText(80),
  country: z.string().trim().length(2).default("US"),
});

export const listLimitSchema = z.coerce.number().int().min(1).max(200);
export const searchQuerySchema = z.string().trim().min(2).max(100);

export const spotifyImportSchema = z.object({
  artistIds: z.union([z.string().max(4000), z.array(z.string().max(100)).max(50)]).optional(),
  playlistUrl: z.string().trim().url().max(500).optional(),
  selectedArtistIds: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  city: optionalText(120),
  state: optionalText(80),
  country: z.string().trim().length(2).default("US"),
}).refine((value) => value.artistIds || value.playlistUrl, {
  message: "Provide Spotify artist IDs or a public playlist URL.",
});

export const notificationSettingsSchema = z.object({
  discordWebhook: z.string().trim().max(500).nullable().optional(),
  discordEnabled: z.boolean().optional(),
  email: z.string().trim().email().max(254).nullable().optional(),
  emailEnabled: z.boolean().optional(),
  phone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/).nullable().optional(),
  smsEnabled: z.boolean().optional(),
});

export const smsCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/),
});

export const pollRequestSchema = z.object({
  city: optionalText(120),
});

export const parseJson = async <T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> => schema.parse(await request.json());

