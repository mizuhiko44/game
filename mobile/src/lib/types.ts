export type User = {
  id: string;
  nickname: string;
  regionCode: string;
  totalPoints: number;
};

export type EventItem = {
  id: string;
  title: string;
  eventType: "global" | "local";
  status: string;
  voteEndAt: string;
  minBetPoints: number;
  options?: Array<{ id: string; label: string }>;
};

export type VoteHistoryItem = {
  id: string;
  inputBetPoints: number;
  status: string;
  rewardPoints: number;
  event: { title: string };
  option: { label: string };
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
