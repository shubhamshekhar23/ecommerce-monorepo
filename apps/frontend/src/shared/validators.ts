import { z } from "zod";

export const emailSchema = z
  .string()
  .email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, "Please enter a valid phone number")
  .optional()
  .or(z.literal(""));

export const postalCodeSchema = z
  .string()
  .regex(/^[A-Z0-9\s-]{3,10}$/i, "Please enter a valid postal code");

export const nameSchema = (field: string) =>
  z.string().min(1, `${field} is required`).max(50, `${field} is too long`);
