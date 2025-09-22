import { TRPCError } from "@trpc/server";
import { compare, hash } from "bcrypt";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { setSession } from "~/server/auth";
import { CreateAccountSchema, UserLoginSchema } from "~/server/schemas/user";

export const userRouter = createTRPCRouter({
  signup: publicProcedure
    .input(CreateAccountSchema)
    .mutation(async ({ input, ctx: { db } }) => {
      const foundUser = await db.user.findUnique({
        where: { username: input.username },
      });

      if (foundUser)
        return new TRPCError({
          code: "CONFLICT",
          message: "Username already taken",
        });

      const password = await hash(input.password, 12);

      const createdUser = await db.user.create({
        data: {
          email: input.email,
          username: input.username,
          password,
        },
      });

      await setSession(createdUser.id);

      return { id: createdUser.id };
    }),

  login: publicProcedure
    .input(UserLoginSchema)
    .mutation(async ({ input: { identifier, password }, ctx: { db } }) => {
      const user = await db.user.findFirst({
        where: {
          OR: [{ username: identifier }, { email: identifier }],
        },
      });

      if (!user)
        return new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect credentials",
        });

      const isPasswordCorrect = await compare(password, user.password);

      if (!isPasswordCorrect)
        return new TRPCError({
          code: "BAD_REQUEST",
          message: "Incorrect credentials",
        });

      await setSession(user.id);
    }),

  me: protectedProcedure.query(async ({ ctx: { user } }) => {
    if (user) {
      await setSession(user.id);
    }

    return {
      id: user.id,
      username: user.username,
    };
  }),
});
