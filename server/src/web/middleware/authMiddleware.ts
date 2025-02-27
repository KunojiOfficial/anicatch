import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

import { db } from "index";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const response = await fetch("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error("Invalid token");
        }

        const userData = await response.json();

        const user = await db.user.findUnique({
            where: {
                discordId: userData.id,
            },
            select: { id: true, discordId: true }
        });

        if (!user) {
            throw new Error("User not found");
        }

        req.user = {...userData, db: user};

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
}
