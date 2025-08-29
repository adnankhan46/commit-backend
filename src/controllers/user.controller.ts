import type { NextFunction, Request, Response } from "express";
import {
  BadTokenError,
  InternalError,
  NotFoundError,
} from "../utils/CustomError.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";
import logger from "../utils/logger.js";

export const getUser = async ( req: Request, res: Response, next: NextFunction) => 
    {
    const {id} = req.params;

  if (!mongoose.Types.ObjectId.isValid(id as string)) {
    return next(new BadTokenError("Invalid User Id"));
  }
  try {
    const user = await User.findById(id).populate("walletId");
    if (!user) {
      return next(new NotFoundError("User not found"));
    }
    res.json(user);
  } catch (error) {
    logger.error(`Internal Error: ${error}`)
    throw new InternalError(`Internal Error`);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.json(user);
};

export const deleteUser = async (req: Request, res: Response) => {
  await User.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
};
