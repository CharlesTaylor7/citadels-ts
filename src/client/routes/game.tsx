import { useParams, Link } from "react-router";
import { trpc } from "@/client/router";
import { useMutation, useQuery } from "@tanstack/react-query";

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/game")({
  component: Game,
});
function Game() {
  return <div>TODO</div>;
}
