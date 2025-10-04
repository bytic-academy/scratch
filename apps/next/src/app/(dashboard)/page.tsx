import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import Header from "./_components/Header";
import List from "./_components/List";

export default async function Home() {
  const user = await auth();

  if (!user) redirect("/auth/login");

  return (
    <div className="container mx-auto mt-12 flex flex-col gap-12 px-6">
      <Header />

      <List />
    </div>
  );
}
