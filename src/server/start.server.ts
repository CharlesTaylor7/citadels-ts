import { server } from "./fastify.server";

console.log("Server started");
await server.listen({ port: 3000 });
