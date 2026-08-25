import { z } from "zod";

export const updateProfileSchema = z.object({
  profile_id: z.string().min(1, "Profile ID required"),
  profile_name: z.string().min(2, "Profile name too short").max(25, "Profile name too long"),
  avatar_url: z.string().optional(),
  avatar_id: z.number().or(z.string()).optional(),
  is_kid: z.boolean().optional(),
});
