export interface CreateUserDTO {
  email: string;
  inviteCode: string; // the invite code they used to join
}

export interface RequestOtpDTO {
  email: string;
  inviteCode?: string; // required only for new users
}

export interface VerifyOtpDTO {
  email: string;
  otp: string;
}

export interface UpdateUserDTO {
  expoPushTokens?: string[];
}

export interface UserPublicProfile {
  id: string;
  email: string;
  myInviteCode: string;
  inviteQuota: number;
  isAdmin: boolean;
  createdAt: Date;
}
