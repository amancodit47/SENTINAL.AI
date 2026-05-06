import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import keywordsRouter from "./keywords";
import sourcesRouter from "./sources";
import signalsRouter from "./signals";
import engineTypesRouter from "./engine-types";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(keywordsRouter);
router.use(sourcesRouter);
router.use(signalsRouter);
router.use(engineTypesRouter);

export default router;
