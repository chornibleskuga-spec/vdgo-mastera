import { createRouter, publicQuery } from "./middleware";
import { workCaseRouter } from "./routers/work-case-router";
import { kpiRouter } from "./routers/kpi-router";
import { noteRouter } from "./routers/note-router";
import { syncRouter } from "./routers/sync-router";
import { dutyRouter } from "./routers/duty-router";
import { dispatcherRouter } from "./routers/dispatcher-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  workCase: workCaseRouter,
  kpi: kpiRouter,
  duty: dutyRouter,
  dispatcher: dispatcherRouter,
  note: noteRouter,
  sync: syncRouter,
});

export type AppRouter = typeof appRouter;
