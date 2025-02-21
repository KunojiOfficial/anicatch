import { Response, Request, NextFunction } from "express";

const cooldowns = new Map();

export async function cooldownMiddleware(req: Request, res: Response, next: NextFunction) {
    const { user } = req;
    const { id } = user;

    if (!cooldowns.has(id)) {
        cooldowns.set(id, Date.now());
        next();
    } else {
        const now = Date.now();
        const cooldown = cooldowns.get(id);
        const diff = now - cooldown;
        if (diff < 1000) {
            res.status(429).json({ message: "You are being rate limited" });
        } else {
            cooldowns.set(id, Date.now());
            next();
        }
    }
}