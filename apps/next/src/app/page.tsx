import { redirect } from "next/navigation";

import { auth } from "~/server/auth";

export default async function Home() {
  const user = await auth();

  if (!user) redirect("/auth/login");

  return "hello " + user?.username;
}
