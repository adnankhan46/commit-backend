import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { BadRequestError } from "../utils/CustomError.js";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      return next(new BadRequestError(message));
    }
    req.body = result.data;
    next();
  };
