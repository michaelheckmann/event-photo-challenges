import { Hono } from "hono";
import { challengesRoutes } from "./routes/challenges";
import { photosRoutes } from "./routes/photos";

const app = new Hono<{ Bindings: Env }>();

app.route("/api", photosRoutes);
app.route("/api", challengesRoutes);

export type AppType = typeof app;

export default app;
