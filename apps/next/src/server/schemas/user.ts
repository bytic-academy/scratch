import z from "zod/v4";

export const UserLoginSchema = z.object({
  identifier: z.string().min(3).max(255),
  password: z.string().min(8).max(255),
});

export type UserLoginSchema = z.output<typeof UserLoginSchema>;

export const CreateAccountSchema = z.object({
  email: z.email().max(255),
  username: z.string().min(3).max(255),
  password: z.string().min(8).max(255),
});

export type CreateAccountSchema = z.output<typeof CreateAccountSchema>;
