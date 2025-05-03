export const CARD_SUITS = [
  "Trade",
  "Religious",
  "Military",
  "Noble",
  "Unique",
] as const;

export type CardSuit = (typeof CARD_SUITS)[number];

export const CARD_SUIT = {
  TRADE: CARD_SUITS[0],
  RELIGIOUS: CARD_SUITS[1],
  MILITARY: CARD_SUITS[2],
  NOBLE: CARD_SUITS[3],
  UNIQUE: CARD_SUITS[4],
} as const;

export type BlackmailMarker = { type: "Blackmail"; flowered: boolean };
export type WarrantMarker = { type: "Warrant"; signed: boolean };

export type Marker =
  | { type: "Discarded" | "Killed" | "Bewitched" | "Robbed" }
  | BlackmailMarker
  | WarrantMarker;

type MarkerType = Marker["type"];

export const MarkerUtils = {
  isWarrant(marker: Marker): marker is WarrantMarker {
    return marker.type === "Warrant";
  },

  isBlackmail(marker: Marker): marker is BlackmailMarker {
    return marker.type === "Blackmail";
  },

  createWarrant(signed: boolean = false): WarrantMarker {
    return { type: "Warrant", signed };
  },

  createBlackmail(flowered: boolean = false): BlackmailMarker {
    return { type: "Blackmail", flowered };
  },
};

export type DistrictName = string;
export type PlayerId = number;
export type Cost = number;
