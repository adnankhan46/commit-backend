import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  email: string;
  phone: string;
  inviteCode: string;
  inviteQuota: number;
  friends: Types.ObjectId[];
  walletId: Types.ObjectId;
  expoPushTokens: string[];
}

const UserSchema: Schema<IUser> = new Schema(
  {
    email: { type: String, required: true, unique: true },
    phone: { type: String, unique: false }, // for now decided using email only
    inviteCode: { type: String, required: true },
    inviteQuota: { type: Number, default: 5 },
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
    walletId: { type: Schema.Types.ObjectId, ref: "Wallet" },
    expoPushTokens: [{ type: String }],
  },
  { timestamps: true }
);

const User = mongoose.model<IUser>("User", UserSchema);

export default User;
