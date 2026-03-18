export type User = {
  id: string;
  nickname: string;
  regionCode: string;
  totalPoints: number;
};

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  eventType: "global" | "local";
  status: string;
  voteEndAt: string;
  resultAt?: string;
  minBetPoints: number;
  options?: Array<{ id: string; label: string; sortOrder?: number }>;
};

export type EventDetailPayload = EventItem & {
  alreadyVoted: boolean;
  popularity: Array<{ optionId: string; _count: number }>;
};

export type VoteHistoryItem = {
  id: string;
  eventId: string;
  optionId: string;
  inputBetPoints: number;
  actualConsumedPoints?: number;
  status: string;
  rewardPoints: number;
  createdAt?: string;
  event: { title: string };
  option: { label: string };
};

export type VoteCreateResponse = {
  id: string;
  eventId: string;
  optionId: string;
  inputBetPoints: number;
  actualConsumedPoints: number;
  status: string;
};

export type AvatarPayload = {
  avatar: {
    id: string;
    avatarType: string;
    level: number;
    exp: number;
    passiveEffects: Array<{ effectType: string; effectValue: number }>;
  };
  items: Array<{ id: string; quantity: number; item: { id: string; name: string; expValue: number } }>;
};


export type AdminSettleResponse = {
  idempotent: boolean;
  eventResult: {
    id: string;
    eventId: string;
    winningOptionId: string;
    settledAt: string;
  };
  processedVoteCount: number;
  winnerCount: number;
  totalRewardPoints: number;
  rewardedItemUserCount: number;
};
