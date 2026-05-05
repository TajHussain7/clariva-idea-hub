import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import ideasRouter from "./ideas.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(ideasRouter);

export default router;
