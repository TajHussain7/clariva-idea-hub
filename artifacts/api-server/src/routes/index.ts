import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import ideasRouter from "./ideas.js";
import teamsRouter from "./teams.js";
import teamMembersRouter from "./team-members.js";
import teamIdeasRouter from "./team-ideas.js";
import teamDiscussionsRouter from "./team-discussions.js";
import teamPresenceRouter from "./team-presence.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ideasRouter);
router.use(teamsRouter);
router.use(teamMembersRouter);
router.use(teamIdeasRouter);
router.use(teamDiscussionsRouter);
router.use(teamPresenceRouter);

export default router;
