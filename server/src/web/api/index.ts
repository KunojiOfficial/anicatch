import { Router } from "express";
import authRouter from "./auth";
import battleRouter from "./battle";

const router = Router();

router.use("/auth", authRouter);
router.use("/battle", battleRouter);

export default router;