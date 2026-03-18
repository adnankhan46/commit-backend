export interface CreateCommitmentDTO {
  title: string;
  description?: string;
  habitPrompt?: string;
  dailyStake: number; // points per day
  payoutType: "friend" | "donate";
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  checkinHourIst?: number; // 0-23, default 8
  partnerIds?: string[]; // user IDs to add as partners
}

export interface CommitmentResponse {
  id: string;
  title: string;
  description: string | null;
  habitPrompt: string | null;
  dailyStake: string;
  payoutType: "friend" | "donate";
  status: "active" | "completed" | "cancelled";
  startDate: string;
  endDate: string;
  checkinHourIst: number;
  creatorId: string;
  createdAt: Date;
}
