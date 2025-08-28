import mongoose, { Schema, Document, Types } from "mongoose";

export interface IWallet extends Document {
  balance: number;
  currency: string;
  owner: Types.ObjectId; // references User
}

const WalletSchema: Schema<IWallet> = new Schema(
  {
    balance: { type: Number, default: 0 },
    currency: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const Wallet = mongoose.model<IWallet>("Wallet", WalletSchema);

export default Wallet;
