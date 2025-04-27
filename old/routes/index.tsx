// app/routes/index.tsx
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "../../app/db";
import { validateSessionToken } from "../../app/services/auth-service";
import { getCookie } from "vinxi/server";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    const token = getCookie("session");
    if (token) {
      const { user } = await validateSessionToken(token);
      if (user) {
        throw redirect({
          to: "/lobby",
        });
      }
    }
    throw redirect({
      to: "/login",
    });
  },
});

function Home() {
  Route.useLoaderData();
  return null;
}
