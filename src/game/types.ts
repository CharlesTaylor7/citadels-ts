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
 * Base marker types without parameters
 */
export const BASE_MARKERS = [
  "Discarded",
  "Killed",
  "Bewitched",
  "Robbed",
] as const;

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
  | (typeof BASE_MARKERS)[number]
  | BlackmailMarker
  | WarrantMarker;

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
    return (
      typeof marker === "object" &&
      "type" in marker &&
      marker.type === "Warrant"
    );
  },

  /**
   * Check if a marker is a blackmail
   * @param marker The marker to check
   * @returns True if the marker is a blackmail, false otherwise
   */
  isBlackmail(marker: Marker): marker is BlackmailMarker {
    return (
      typeof marker === "object" &&
      "type" in marker &&
      marker.type === "Blackmail"
    );
  },

  /**
   * Create a warrant marker
   * @param signed Whether the warrant is signed
   * @returns A warrant marker
   */
  createWarrant(signed: boolean = false): WarrantMarker {
    return { type: "Warrant", signed };
  },

  /**
   * Create a blackmail marker
   * @param flowered Whether the blackmail is flowered
   * @returns A blackmail marker
   */
  createBlackmail(flowered: boolean = false): BlackmailMarker {
    return { type: "Blackmail", flowered };
  },
};

/**
 * Type for string-based identifiers that represent district names
 */
export type DistrictName = string;

/**
 * Type for string-based identifiers that represent player IDs
 */
export type PlayerId = string;

/**
 * Type for numeric values representing costs in the game
 */
export type Cost = number;
