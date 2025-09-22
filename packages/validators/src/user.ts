import z from "zod/v4";

export const UserLoginSchema = z.object({
  identifier: z.string().min(3).max(255),
  password: z.string().min(8).max(255),
});
