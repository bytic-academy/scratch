"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import z from "zod/v4";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { CreateAccountSchema as SignupSchema } from "~/server/schemas/user";
import { trpc } from "~/utils/trpc";

const schema = SignupSchema.extend({
  confirmPassword: z.string(),
});

const page = () => {
  const router = useRouter();
  const { register, handleSubmit } = useForm<z.output<typeof schema>>({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    resolver: standardSchemaResolver(schema),
  });

  const { mutate: signup } = useMutation(
    trpc.user.signup.mutationOptions({
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
                  signup(values);
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
                    <Label htmlFor="email">ایمیل</Label>
                    <Input
                      dir="auto"
                      id="email"
                      type="email"
                      {...register("email")}
                    />
                  </div>
                  <div className="grid gap-3">
                    <Label htmlFor="username">نام کاربری</Label>
                    <Input
                      dir="auto"
                      id="username"
                      type="text"
                      {...register("username")}
                    />
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-center">
                      <Label htmlFor="password">کلمه عبور</Label>
                    </div>
                    <Input
                      dir="auto"
                      id="password"
                      type="password"
                      {...register("password")}
                    />
                    <div className="flex items-center">
                      <Label htmlFor="confirmPassword">تکرار کلمه عبور</Label>
                    </div>
                    <Input
                      dir="auto"
                      id="confirmPassword"
                      type="password"
                      {...register("confirmPassword")}
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
