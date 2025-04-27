import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx", { unstable_middleware: [] }),
  route("/login", "routes/login.tsx"),
  route("/signup", "routes/signup.tsx"),
  route("/lobby", "routes/lobby.tsx"),
  route("/game/:roomId", "routes/game.tsx")
] satisfies RouteConfig;
