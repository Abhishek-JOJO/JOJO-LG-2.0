import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z.string().min(5, "Invalid phone or email"),
  phone_code: z.string().optional(),
  is_register: z.boolean().optional(),
  source: z.string().optional(),
});

export const verifyOtpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
  phone: z.string().min(5),
  phone_code: z.string().optional(),
  is_register: z.boolean().optional(),
  source: z.string().optional(),
});

export const checkUserSchema = z.object({
  phone: z.string().optional(),
  phone_code: z.string().optional(),
  email: z.string().optional(),
  source: z.string().optional(),
});
