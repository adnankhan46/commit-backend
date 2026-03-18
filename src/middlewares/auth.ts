import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import db from "../db/index.js";
import { users } from "../db/schema/index.js";
import config from "../config/env.js";
import { BadTokenError, UnauthorizedError } from "../utils/CustomError.js";

export const protect = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return next(new UnauthorizedError("No token provided"));
    }

    const token = authHeader.split(" ")[1]!;

    let decoded: { userId: string };
    try {
      decoded = jwt.verify(token, config.JWT_SECRET) as { userId: string };
    } catch {
      return next(new BadTokenError("Invalid or expired token"));
    }

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (userRows.length === 0) {
      return next(new UnauthorizedError("User not found"));
    }

    req.user = userRows[0]!;
    next();
  } catch {
    next(new UnauthorizedError("Authentication failed"));
  }
};
