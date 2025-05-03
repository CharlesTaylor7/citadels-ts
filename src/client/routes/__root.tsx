import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/client/router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type { AppRouter } from "@/server/trpc/router";
import type { QueryClient } from "@tanstack/react-query";

export interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
});

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });
  const userQuery = useQuery(trpc.auth.me.queryOptions());
  const user = userQuery.data?.user;

  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      <nav className="navbar bg-base-200 shadow-lg">
        <div className="container mx-auto">
          <div className="flex-1">
            <Link to="/" className="btn btn-ghost text-xl">
              Citadels
            </Link>
          </div>
          <div className="flex-none gap-2">
            <ul className="menu menu-horizontal px-1 gap-2">
              <li>
                <Link
                  to="/lobby"
                  className="btn btn-ghost btn-sm"
                  activeProps={{ className: "btn-active" }}
                >
                  Lobby
                </Link>
              </li>
              <li>
                <Link
                  to="/game"
                  className="btn btn-ghost btn-sm"
                  activeProps={{ className: "btn-active" }}
                >
                  Game
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="btn btn-ghost btn-sm"
                  activeProps={{ className: "btn-active" }}
                >
                  About
                </Link>
              </li>
              {user ? (
                <>
                  <li>
                    <Link
                      to="/profile"
                      className="btn btn-ghost btn-sm"
                      activeProps={{ className: "btn-active" }}
                    >
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/logout"
                      className="btn btn-ghost btn-sm text-error"
                    >
                      Logout
                    </Link>
                  </li>
                </>
              ) : (
                <li>
                  <Link
                    to="/login"
                    className="btn btn-ghost btn-sm"
                    activeProps={{ className: "btn-active" }}
                  >
                    Login
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto p-4">
        <Outlet />
      </main>

      <TanStackRouterDevtools />
      <ReactQueryDevtools />
    </div>
  );
}
