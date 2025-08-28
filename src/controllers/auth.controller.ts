import type { Request, Response } from "express";
import { BadRequestError } from "../utils/CustomError.js";
import User from "../models/user.model.js";
import Wallet from "../models/wallet.model.js";
import type { Types } from "mongoose";


/**
 * 
 * @param req 
 * @param res 
 */

export const createUser = async (req: Request, res: Response) => {
  try {

    const {phone, inviteCode, friends, expoPushTokens} = req.body;

    if(!phone || phone === ""){
            throw new BadRequestError("Invalid Mobile Number")
      }
      if(!inviteCode || inviteCode === ""){
            throw new BadRequestError("Invalid Code")
      }
    const user = new User({
      phone: phone,
      inviteCode: inviteCode,
      friends: friends || [],
      expoPushTokens: expoPushTokens || [],
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
    res.status(400).json({ message: "Error creating user", error: err });
  }
};


