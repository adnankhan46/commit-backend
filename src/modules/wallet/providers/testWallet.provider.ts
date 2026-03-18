import type { IPaymentProvider } from "./payment.provider.js";
import { creditWallet } from "../wallet.service.js";

/**
 * TestWalletProvider — credits points directly to wallet.
 * No external payment gateway involved.
 *
 * To switch to DodoPayments or Razorpay:
 * 1. Create dodopayments.provider.ts implementing IPaymentProvider
 * 2. Replace the export below with the new provider instance
 */
export class TestWalletProvider implements IPaymentProvider {
  async topup(userId: string, amount: number, description = "Wallet top-up"): Promise<void> {
    await creditWallet(userId, amount, null, description);
  }
}

export const paymentProvider: IPaymentProvider = new TestWalletProvider();
