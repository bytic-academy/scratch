"use server";

import { cache } from "react";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

import { env } from "~/env";
import { db } from "./db";

const ACCESS_TOKEN_KEY = "access_token";

export const setSession = async (id: string) => {
  const cookieStore = await cookies();

  const token = jwt.sign({ id }, env.AUTH_SECRET);

  cookieStore.set(ACCESS_TOKEN_KEY, token, {
    httpOnly: env.NODE_ENV === "production",
    secure: env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
};

export const getSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_KEY);

  if (!token) return null;

  try {
    const payload = jwt.verify(token.value, env.AUTH_SECRET) as { id: string };

    return payload.id;
  } catch {
    return null;
  }
};

export const auth = cache(async () => {
  const userId = await getSession();

  const user = userId
    ? await db.user.findUnique({
        where: {
          id: userId,
        },
      })
    : null;

  return user;
});
