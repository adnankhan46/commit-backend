import type { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../utils/CustomError.js";
import User from "../models/user.model.js";
import Wallet from "../models/wallet.model.js";
import type { Types } from "mongoose";
import type { CreateUserDTO } from "../types/user.types.js";
import logger from "../utils/logger.js";

/**
 *
 * @param req
 * @param res
 */

export const createUser = async ( req: Request, res: Response, next: NextFunction ) => {
  try {
    const { email, inviteCode }: CreateUserDTO = req.body;

    if (!email || email === "") {
      return next(new BadRequestError("Invalid Email"));
    }
    if (!inviteCode || inviteCode === "") {
      return next(new BadRequestError("Invalid Code"));
    }
    const user = new User({
      email: email,
      inviteCode: inviteCode,
      // inviteQuota is default set
    });

    await user.save();

    const wallet = new Wallet({
      // balance is default set
      currency: "INR", // default currency supported
      owner: user._id,
    });

    await wallet.save();

    // Linking wallet to user
    user.walletId = wallet._id as Types.ObjectId;
    await user.save();

    res.status(201).json({ user, wallet });
  } catch (err) {
    logger.error(`Error Creating User: ${err}`)
    res.status(400).json({ message: "Error creating user", error: err });
  }
};
