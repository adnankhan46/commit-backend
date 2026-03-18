import type { NextFunction, Request, Response } from "express";
import * as userService from "./user.service.js";
import { BadRequestError, NotFoundError } from "../../utils/CustomError.js";

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await userService.getMe(req.user!.id);
    res.json(data);
  } catch (err) {
    next(new NotFoundError((err as Error).message));
  }
};

export const updatePushTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { pushToken, action } = req.body as { pushToken: string; action: "add" | "remove" };
    if (!pushToken || !["add", "remove"].includes(action)) {
      return next(new BadRequestError("pushToken and action (add|remove) are required"));
    }
    const result = await userService.updatePushToken(req.user!.id, pushToken, action);
    res.json(result);
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const getUserByIdController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.id!);
    res.json(user);
  } catch (err) {
    next(new NotFoundError((err as Error).message));
  }
};
