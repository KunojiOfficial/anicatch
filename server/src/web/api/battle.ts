import { Router } from "express";
import { getBattle } from "../services/battleService";
import rateLimit from "express-rate-limit";

const router = Router();

const limiter = rateLimit({
    windowMs: 2 * 1000, // 2 seconds
    // max: 1, // Limit each IP to 1 request per windowMs
    message: "You can only make one request every 2 seconds"
});

router.post("/:discordId", limiter, async (req, res) => {
    try {
        const battleData = await getBattle(req.params.discordId);
        res.json({...battleData, type: "UPDATE_BATTLE"});
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
