import { Request } from "express";

declare module "express-serve-static-core" {
    interface Request {
        user?: any; // Add user property to Request interface
    }
}
