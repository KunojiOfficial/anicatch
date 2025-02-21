import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

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
        req.user = userData;

        next();
    } catch (error) {
        res.status(401).json({ message: "Invalid token" });
    }
}
