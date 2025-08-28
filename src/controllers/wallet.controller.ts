import type { Request, Response } from "express";
import Wallet from "../models/wallet.model.js";

export const getWallet = async (req: Request, res: Response) => {
  const wallet = await Wallet.findById(req.params.id).populate("owner");
  if (!wallet) return res.status(404).json({ message: "Wallet not found" });
  res.json(wallet);
};