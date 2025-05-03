/**
 * All available card suits in the game
 */
export const CARD_SUITS = [
  "Trade",
  "Religious",
  "Military",
  "Noble",
  "Unique",
] as const;

/**
 * Represents the different suits (categories) of district cards in the game
 * Type is derived from the array of all values
 */
export type CardSuit = (typeof CARD_SUITS)[number];

/**
 * Constants for card suits to avoid string literals throughout the code
 */
export const CARD_SUIT = {
  TRADE: CARD_SUITS[0],
  RELIGIOUS: CARD_SUITS[1],
  MILITARY: CARD_SUITS[2],
  NOBLE: CARD_SUITS[3],
  UNIQUE: CARD_SUITS[4],
} as const;

/**
 * Utility functions for CardSuit
 */
export const CardSuitUtils = {
  /**
   * Get a string representation of a card suit
   * @param suit The card suit to convert to string
   * @returns A string representation of the card suit
   */
  toString(suit: CardSuit): string {
    return suit;
  },
};

/**
 * Marker types with additional parameters
 */
// Blackmail marker with flowered parameter
export type BlackmailMarker = { type: "Blackmail"; flowered: boolean };

// Warrant marker with signed parameter
export type WarrantMarker = { type: "Warrant"; signed: boolean };

/**
 * Union type for all possible markers in the game
 */
export type Marker =
  | { type: "Discarded" | "Killed" | "Bewitched" | "Robbed" }
  | BlackmailMarker
  | WarrantMarker;

type MarkerType = Marker["type"];

/**
 * Utility functions for Marker type
 */
export const MarkerUtils = {
  /**
   * Check if a marker is a warrant
   * @param marker The marker to check
   * @returns True if the marker is a warrant, false otherwise
   */
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
