"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { UserLoginSchema } from "~/server/schemas/user";
import { trpc } from "~/utils/trpc";

const page = () => {
  const router = useRouter();

  const { register, handleSubmit } = useForm<UserLoginSchema>({
    defaultValues: {
      identifier: "",
      password: "",
    },
    resolver: standardSchemaResolver(UserLoginSchema),
  });

  const { mutate: login } = useMutation(
    trpc.user.login.mutationOptions({
      onSuccess() {
        router.push("/");
      },
    }),
  );

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form
                onSubmit={handleSubmit((values) => {
                  login(values);
                })}
                className="p-6 md:p-8"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">خوش برگشتی</h1>
                    <p className="text-muted-foreground text-balance">
                      وارد سایت اسکرچ‌تک شو!
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="identifier">نام کاربری یا ایمیل</Label>
                    <Input
                      dir="auto"
                      id="identifier"
                      type="text"
                      {...register("identifier")}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">کلمه عبور</Label>
                      <a
                        href="#"
                        className="ms-auto text-sm underline-offset-2 hover:underline"
                      >
                        کلمه عبور رو فراموش کردی؟
                      </a>
                    </div>
                    <Input
                      dir="auto"
                      id="password"
                      type="password"
                      {...register("password")}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    ورود
                  </Button>

                  <div className="text-center text-sm">
                    هنوز ثبت نکردی؟!{" "}
                    <Link
                      href="/auth/signup"
                      className="underline underline-offset-4"
                    >
                      پس یه حساب کاربری بساز
                    </Link>
                  </div>
                </div>
              </form>
              <div className="bg-muted relative hidden md:block">
                <img
                  src="/placeholder.svg"
                  alt="Image"
                  className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default page;
