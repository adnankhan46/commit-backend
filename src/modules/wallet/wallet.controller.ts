import type { NextFunction, Request, Response } from "express";
import * as walletService from "./wallet.service.js";
import { paymentProvider } from "./providers/testWallet.provider.js";
import { BadRequestError, NotFoundError } from "../../utils/CustomError.js";

export const getWalletController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const wallet = await walletService.getWalletByUserId(req.user!.id);
    if (!wallet) return next(new NotFoundError("Wallet not found"));

    res.json({
      ...wallet,
      availableBalance: (
        parseFloat(wallet.balance) - parseFloat(wallet.holdBalance)
      ).toFixed(2),
    });
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const getTransactionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const transactions = await walletService.getTransactionHistory(req.user!.id, limit, offset);
    res.json({ transactions, limit, offset });
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};

export const topupController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount } = req.body as { amount: number };
    await paymentProvider.topup(req.user!.id, amount);
    const wallet = await walletService.getWalletByUserId(req.user!.id);
    res.json({ message: `${amount} points added to your wallet.`, wallet });
  } catch (err) {
    next(new BadRequestError((err as Error).message));
  }
};
