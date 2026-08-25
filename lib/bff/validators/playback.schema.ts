import { z } from "zod";

export const playbackRequestSchema = z.object({
  asset_id: z.number().or(z.string()).optional(),
  assetId: z.number().or(z.string()).optional(),
  is_subscribe: z.boolean().optional(),
  isSubscribe: z.boolean().optional(),
  contentId: z.number().or(z.string()).optional(),
});
