import { Types } from "mongoose";

export interface UserDTO {
  email: string;
  phone: string;
  inviteCode: string;
  inviteQuota: number;
  friends: Types.ObjectId[];
  walletId?: Types.ObjectId;
  expoPushTokens: string[];
}

export interface CreateUserDTO {
  email: string;
  // phone: string;
  inviteCode: string;
}

export interface UserResponse {
  id: string;
  phone: string;
  email: string;
  inviteCode: string;
  inviteQuota: number;
  friends: string[];
  walletId?: string;
  expoPushTokens: string[];
}
