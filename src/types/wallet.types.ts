export interface WalletResponse {
  id: string;
  userId: string;
  balance: string;
  holdBalance: string;
  currency: string;
  availableBalance: number; // balance - holdBalance
}

export interface TransactionResponse {
  id: string;
  walletId: string;
  type: string;
  amount: string;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
}
