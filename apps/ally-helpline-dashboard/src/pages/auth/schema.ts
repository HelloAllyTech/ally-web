import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim()
      .min(1, "Email is required").email("Invalid email format"),
    password: z.string().trim()
      .min(1, "Password is required"),
  })
  .required();

export type LoginSchema = z.infer<typeof loginSchema>;
