import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/deployment")({
  component: RouteComponent,
});

const SHA = import.meta.env.VITE_COMMIT_SHA;
const environment = SHA ? `Deployed: ${SHA}` : "Development";

function RouteComponent() {
  return <div>{environment}</div>;
}
