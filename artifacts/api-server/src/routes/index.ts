import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import ideasRouter from "./ideas.js";
import teamsRouter from "./teams.js";
import teamMembersRouter from "./team-members.js";
import teamIdeasRouter from "./team-ideas.js";
import teamDiscussionsRouter from "./team-discussions.js";
import teamPresenceRouter from "./team-presence.js";
import publicFeedRouter from "./public-feed.js";
import challengesRouter from "./challenges.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ideasRouter);
router.use(teamsRouter);
router.use(teamMembersRouter);
router.use(teamIdeasRouter);
router.use(teamDiscussionsRouter);
router.use(teamPresenceRouter);
router.use(publicFeedRouter);
router.use(challengesRouter);

export default router;
