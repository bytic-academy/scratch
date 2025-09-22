import React from "react";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";

const layout: React.FC<React.PropsWithChildren> = async ({ children }) => {
  const user = await auth();

  if (user) redirect("/");

  return children;
};

export default layout;
