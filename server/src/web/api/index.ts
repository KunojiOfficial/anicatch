import { Router } from "express";

import authRouter from "./auth.ts";
import battleRouter from "./battle.ts";

const router = Router();

router.use("/auth", authRouter);
router.use("/battle", battleRouter);

export default router;