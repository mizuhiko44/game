export type User = {
  id: string;
  nickname: string;
  regionCode: string;
  totalPoints: number;
};

export type AdminRegisteredUser = User & {
  createdAt: string;
  avatarType?: string | null;
};

export type EventOption = { id: string; label: string; sortOrder?: number };

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  eventType: "global" | "local";
  status: string;
  voteEndAt: string;
  resultAt?: string;
  minBetPoints: number;
  participantCount?: number;
  category?: "sports" | "economy" | "entertainment" | "local";
  regionCode?: string | null;
  options?: EventOption[];
  result?: {
    id: string;
    winningOptionId: string;
    settledAt: string;
    winningOption?: { id: string; label: string };
  } | null;
  myVote?: {
    id: string;
    optionId: string;
    optionLabel: string;
    inputBetPoints: number;
    status: string;
    rewardPoints: number;
  } | null;
};

export type EventDetailPayload = EventItem & {
  alreadyVoted: boolean;
  popularity: Array<{ optionId: string; _count: number }>;
};

export type EventParticipantsPayload = {
  eventId: string;
  eventTitle: string;
  participantCount: number;
  participants: Array<{
    voteId: string;
    joinedAt: string;
    status: string;
    user: { id: string; nickname: string; regionCode: string };
    option: { id: string; label: string };
  }>;
};

export type AdminCreateEventPayload = {
  eventType: "global" | "local";
  regionCode?: string;
  category: "sports" | "economy" | "entertainment" | "local";
  title: string;
  description: string;
  startAt?: string;
  voteEndAt: string;
  resultAt: string;
  minBetPoints: number;
  rewardItemId?: string;
  rewardItemQuantity?: number;
  options: string[];
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
  event: {
    title: string;
    status?: string;
    result?: {
      winningOptionId: string;
      settledAt: string;
      winningOption?: { id: string; label: string };
    } | null;
  };
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

export type MyPagePayload = {
  nickname: string;
  regionCode: string;
  totalPoints: number;
  totalVotes: number;
  hitRate: number;
  avatarLevel: number;
  winningStreak: number;
  bestWinningStreak: number;
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
