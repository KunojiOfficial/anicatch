import { Router } from "express";
import { getBattle, setMove, switchCard, useItem, run } from "../services/battleService";
import rateLimit from "express-rate-limit";
import { authMiddleware } from "../middleware/authMiddleware";
import { cooldownMiddleware } from "../middleware/cooldownMiddleware";

const router = Router();

const limiter = rateLimit({
    windowMs: 2 * 1000, // 2 seconds
    // max: 1, // Limit each IP to 1 request per windowMs
    handler: (req, res, next) => {
        // Do nothing, just drop the request
    }
});

router.post("/", limiter, authMiddleware, async (req, res) => {
    try {
        const battleData = await getBattle(req.user.db.id);
        res.json({...battleData, type: "UPDATE_BATTLE"});
    } catch (error) {
        res.json({type: "BATTLE_NOT_FOUND"});
        // res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/move", limiter, authMiddleware, cooldownMiddleware, async (req, res) => {
    try {
        const response = await setMove(req.user.db.id, req.body.move);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/switch", limiter, authMiddleware, cooldownMiddleware, async (req, res) => {
    try {
        const response = await switchCard(req.user.db.id, req.body.cardId);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/item", limiter, authMiddleware, cooldownMiddleware, async (req, res) => {
    try {
        const response = await useItem(req.user.db.id, req.body.cardId, req.body.itemId);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/run", limiter, authMiddleware, cooldownMiddleware, async (req, res) => {
    try {
        const response = await run(req.user.db.id);
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
