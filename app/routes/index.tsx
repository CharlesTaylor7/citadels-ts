// app/routes/index.tsx
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { db } from "../db";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    // get signedin  user information
    // if signed in, then redirect to /lobby
    // else redirect to /login
  },
});

function Home() {
  const router = useRouter();
  const state = Route.useLoaderData();

  return <div></div>;
}
