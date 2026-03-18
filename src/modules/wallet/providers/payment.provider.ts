/**
 * IPaymentProvider — abstraction layer for payment/wallet top-up.
 *
 * Current implementation: TestWalletProvider (direct point credit)
 * Future: DodoPayments / Razorpay — implement this interface and swap in env config
 */
export interface IPaymentProvider {
  topup(userId: string, amount: number, description?: string): Promise<void>;
  // Future methods (uncomment when integrating real payments):
  // createPaymentIntent(userId: string, amount: number): Promise<{ clientSecret: string; paymentIntentId: string }>;
  // handleWebhook(payload: unknown, signature: string): Promise<void>;
}
