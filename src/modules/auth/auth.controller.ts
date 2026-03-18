import type { NextFunction, Request, Response } from "express";
import * as authService from "./auth.service.js";
import { sendInviteEmail } from "./email.service.js";
import { BadRequestError } from "../../utils/CustomError.js";

export const signupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const loginController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const sendInviteController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { friendEmail } = req.body as { friendEmail: string };
    const { inviteCode, inviterEmail } = await authService.sendInvite(req.user!.id, friendEmail);
    await sendInviteEmail(friendEmail, inviteCode, inviterEmail);
    res.json({ message: "Invite sent successfully." });
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};
