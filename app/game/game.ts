/**
 * TypeScript port of the Citadels game logic
 * Converted from Rust implementation
 */
import {
  Action,
  ActionTag,
  ActionSubmission,
  BuildMethod,
  CityDistrictTarget,
  MagicianAction,
  Resource,
  WizardMethod,
} from "./actions";
import { DistrictData, DistrictName, DISTRICT_NAMES } from "./districts";
import { Followup, performAction } from "./game-actions";
import { GameConfig, Lobby } from "./lobby";
import { Museum } from "./museum";
import { Rank, RoleName, ROLE_NAMES } from "./roles";
import { CardSuit, Marker, PlayerId } from "./types";
import { shuffle } from "./random";

/**
 * Reasons why a player might be forced to gather
 */
export const FORCED_TO_GATHER_REASONS = [
  "Witch",
  "Bewitched",
  "Blackmailed",
] as const;

export type ForcedToGatherReason = (typeof FORCED_TO_GATHER_REASONS)[number];

/**
 * Player index type
 */
export type PlayerIndex = { 0: number };

/**
 * Player in the game
 */
export interface Player {
  index: PlayerIndex;
  id: string;
  name: string;
  gold: number;
  hand: DistrictName[];
  city: CityDistrict[];
  roles: RoleName[];

  citySize(): number;
  countSuitForResourceGain(suit: CardSuit): number;
  cleanupRound(): void;
  cityHas(name: DistrictName): boolean;
  hasRole(name: RoleName): boolean;
}

/**
 * Implementation of Player methods
 */
export function createPlayer(
  index: PlayerIndex,
  id: string,
  name: string
): Player {
  return {
    index,
    id,
    name,
    gold: 2,
    hand: [],
    city: [],
    roles: [],

    citySize() {
      return this.city.reduce((sum, d) => {
        return sum + (d.name === "Monument" ? 2 : 1);
      }, 0);
    },

    countSuitForResourceGain(suit: CardSuit) {
      return this.city.filter(
        (c) => c.name.data().suit === suit || c.name === "SchoolOfMagic"
      ).length;
    },

    cleanupRound() {
      this.roles = [];
    },

    cityHas(name: DistrictName) {
      return this.city.some((c) => c.name === name);
    },

    hasRole(name: RoleName) {
      return this.roles.some((r) => r === name);
    },
  };
}

/**
 * District in a player's city
 */
export interface CityDistrict {
  name: DistrictName;
  beautified: boolean;

  effectiveCost(): number;
}

/**
 * Create a city district
 */
export function createCityDistrict(name: DistrictName): CityDistrict {
  return {
    name,
    beautified: false,

    effectiveCost() {
      let cost = this.name.data().cost;
      if (this.beautified) {
        cost += 1;
      }
      return cost;
    },
  };
}

/**
 * Deck of cards
 */
export class Deck<T> {
  private deck: T[];
  private discard: T[];

  constructor(deck: readonly T[]) {
    this.deck = [...deck];
    this.discard = [];
  }

  /**
   * Shuffle the deck
   */
  shuffle(): void {
    this.deck.push(...this.discard);
    this.discard = [];
    shuffle(this.deck);
  }

  /**
   * Get the size of the deck
   */
  size(): number {
    return this.deck.length + this.discard.length;
  }

  /**
   * Draw a card from the deck
   */
  draw(): T | undefined {
    if (this.deck.length > 0) {
      return this.deck.pop();
    } else {
      // Swap discard pile into deck and shuffle
      const temp = this.deck;
      this.deck = this.discard.reverse();
      this.discard = temp;
      return this.deck.pop();
    }
  }

  /**
   * Draw multiple cards from the deck
   */
  drawMany(amount: number): T[] {
    const result: T[] = [];
    for (let i = 0; i < amount; i++) {
      const card = this.draw();
      if (card !== undefined) {
        result.push(card);
      }
    }
    return result;
  }

  /**
   * Discard a card to the bottom of the discard pile
   */
  discardToBottom(card: T): void {
    this.discard.push(card);
  }
}

/**
 * Turn types
 */
export const TURN_TYPES = ["GameOver", "Draft", "Call"] as const;
export type TurnType = (typeof TURN_TYPES)[number];

/**
 * Turn state
 */
export type Turn =
  | { type: "GameOver" }
  | { type: "Draft"; draft: Draft }
  | { type: "Call"; call: Call };

/**
 * Call phase
 */
export interface Call {
  index: number;
  endOfRound: boolean;
}

/**
 * Draft phase
 */
export interface Draft {
  playerCount: number;
  player: PlayerIndex;
  remaining: RoleName[];
  theaterStep: boolean;
  initialDiscard: RoleName | null;
  faceupDiscard: RoleName[];

  clear(): void;
}

/**
 * Create a new draft
 */
export function beginDraft(
  playerCount: number,
  player: PlayerIndex,
  roles: readonly RoleName[]
): Draft {
  const draft: Draft = {
    playerCount,
    player,
    remaining: [...roles],
    theaterStep: false,
    initialDiscard: null,
    faceupDiscard: [],

    clear() {
      this.remaining = [];
      this.faceupDiscard = [];
      this.initialDiscard = null;
    },
  };

  const roleCount = draft.remaining.length;

  // Discard cards face up in 4+ player game
  if (draft.playerCount >= 4) {
    for (let i = 0; i < draft.playerCount + 2 - roleCount; i++) {
      let index: number;
      let canBeDiscarded = false;

      while (!canBeDiscarded) {
        index = Math.floor(Math.random() * draft.remaining.length);
        // In TypeScript we'd need to implement canBeDiscardedFaceup
        // This is a placeholder - implement the actual logic
        canBeDiscarded = true;
      }

      const removed = draft.remaining.splice(index, 1)[0];
      draft.faceupDiscard.push(removed);
    }
  }

  // Discard 1 card facedown
  const i = Math.floor(Math.random() * draft.remaining.length);
  draft.initialDiscard = draft.remaining.splice(i, 1)[0];

  // Restore sort of roles
  draft.remaining.sort((a, b) => {
    const rankA = ROLE_NAMES.indexOf(a);
    const rankB = ROLE_NAMES.indexOf(b);
    return rankA - rankB;
  });

  return draft;
}

/**
 * Notification type
 */
export interface Notification {
  message: string;
  playerIndex: PlayerIndex | null;
}

/**
 * Character in the game
 */
export interface Character {
  role: RoleName;
  player: PlayerIndex | null;
  markers: Marker[];
  logs: string[];
  actions: Action[];

  cleanup(): void;
}

/**
 * Create a character
 */
export function createCharacter(role: RoleName): Character {
  return {
    role,
    player: null,
    markers: [],
    logs: [],
    actions: [],

    cleanup() {
      this.player = null;
      this.markers = [];
      this.logs = [];
      this.actions = [];
    },
  };
}

/**
 * Characters collection
 */
export class Characters {
  characters: Character[];

  constructor(roles: readonly RoleName[]) {
    this.characters = roles.map((role) => createCharacter(role));
  }

  /**
   * Get a character by role
   */
  get(role: RoleName): Character | undefined {
    return this.characters.find((c) => c.role === role);
  }

  /**
   * Get a mutable reference to a character by role
   */
  getMut(role: RoleName): Character | undefined {
    return this.get(role);
  }

  /**
   * Find the next character in order
   */
  next(index: number): number | undefined {
    for (let i = index + 1; i < this.characters.length; i++) {
      const character = this.characters[i];
      if (character.player !== null) {
        return i;
      }
    }
    return undefined;
  }

  /**
   * Clean up all characters
   */
  cleanupRound(): void {
    for (const character of this.characters) {
      character.cleanup();
    }
  }
}

/**
 * Game state type definition
 */
export interface GameState {
  players: Player[];
  characters: Characters;
  deck: Deck<DistrictName>;
  logs: string[];
  activeTurn: Turn;
  crowned: PlayerIndex;
  firstToComplete: PlayerIndex | null;
  followup: Followup | null;
  notifications: Notification[];
  museum: Museum;
  alchemist: number;
  taxCollector: number;
}

/**
 * Create a new game state
 */
export function createGame(lobby: Lobby): GameState {
  // Initialize players
  const players = lobby.players.map((player, index) =>
    createPlayer({ 0: index }, player.id, player.name)
  );

  // Initialize characters
  const characters = new Characters(ROLE_NAMES);

  // Initialize deck with all district cards
  const deck = new Deck<DistrictName>(DISTRICT_NAMES);
  deck.shuffle();

  // Initialize museum
  const museum = new Museum();

  // Deal initial cards
  for (const player of players) {
    player.hand = deck.drawMany(4);
  }

  // Create the game state
  return {
    players,
    characters,
    deck,
    museum,
    logs: [],
    crowned: { 0: 0 }, // First player is crowned initially
    taxCollector: 0,
    alchemist: 0,
    firstToComplete: null,
    followup: null,
    notifications: [],
    activeTurn: {
      type: "Draft",
      draft: beginDraft(players.length, { 0: 0 }, ROLE_NAMES),
    },
  };
}

/**
 * Get the active player
 */
export function getActivePlayer(game: GameState): Player | undefined {
  const activeRole = getActiveRole(game);
  if (!activeRole || activeRole.player === null) {
    return undefined;
  }
  return game.players[activeRole.player[0]];
}

/**
 * Get the active role
 */
export function getActiveRole(game: GameState): Character | undefined {
  if (game.activeTurn.type === "Call") {
    return game.characters.characters[game.activeTurn.call.index];
  }
  return undefined;
}

/**
 * Complete a build action
 */
export function completeAction(
  game: GameState,
  playerIndex: PlayerIndex,
  cost: number,
  district: DistrictName
): void {
  const player = game.players[playerIndex[0]];
  player.gold -= cost;

  // Remove from hand
  const index = player.hand.findIndex((d) => d === district);
  if (index >= 0) {
    player.hand.splice(index, 1);
  }

  // Add to city
  player.city.push(createCityDistrict(district));

  // Track alchemist refund
  if (getActiveRole(game)?.role === "Alchemist") {
    game.alchemist += cost;
  }

  // Check for first to complete
  if (game.firstToComplete === null && player.city.length >= 8) {
    game.firstToComplete = playerIndex;
  }
}

/**
 * Discard a district
 */
export function discardDistrict(game: GameState, district: DistrictName): void {
  game.deck.discardToBottom(district);
}

/**
 * Perform an action
 */
export function performGameAction(
  game: GameState,
  action: ActionSubmission
): ActionResult {
  return performAction(game, action);
}

/**
 * Gain cards for the active player
 */
export function gainCards(game: GameState, amount: number): void {
  const player = getActivePlayer(game);
  if (!player) return;

  const cards = game.deck.drawMany(amount);
  player.hand.push(...cards);

  const activeRole = getActiveRole(game);
  if (activeRole) {
    activeRole.logs.push(`${player.name} gains ${amount} cards.`);
  }
}

/**
 * Choose a card from a selection
 */
export function chooseCard(
  game: GameState,
  card: DistrictName,
  selection: DistrictName[]
): void {
  const player = getActivePlayer(game);
  if (!player) return;

  // Add chosen card to hand
  player.hand.push(card);

  // Discard the rest
  for (const district of selection) {
    if (district !== card) {
      discardDistrict(game, district);
    }
  }

  const activeRole = getActiveRole(game);
  if (activeRole) {
    activeRole.logs.push(`${player.name} chooses a card.`);
  }
}
/*
 
  startTurn(): Result<void> {
    try {
      switch (this.activeTurn.type) {
        case "GameOver":
          return { success: true, value: undefined };

        case "Draft": {
          const draft = this.activeTurn.draft;
          if (draft.theaterStep) {
            // Start call phase
            this.activeTurn = {
              type: "Call",
              call: {
                index: 0,
                endOfRound: false,
              },
            };
          } else {
            // Handle special cases for different player counts
            if (
              this.players.length === 3 &&
              this.characters.characters.length === 9 &&
              draft.remaining.length === 5
            ) {
              // For 3 player game with 9 characters, discard 1 randomly
              const index = Math.floor(Math.random() * draft.remaining.length);
              draft.remaining.splice(index, 1);
            }

            // For 7 player 8 role game, or 8 player 9 role game
            if (
              this.players.length + 1 === this.characters.characters.length &&
              draft.remaining.length === 1 &&
              draft.initialDiscard !== null
            ) {
              const initial = draft.initialDiscard;

  if (nextIndex !== undefined) {
    game.activeTurn = {
      type: "Call",
      call: {
        index: nextIndex,
        endOfRound: false,
      },
    };
  } else {
    // Check for Emperor
    const emperor = game.characters.characters.findIndex(
      (c) => c.role === "Emperor"
    );
    if (emperor >= 0) {
      game.activeTurn = {
    if (!player) return;

    const count = player.countSuitForResourceGain(suit);
    if (count > 0) {
      player.gold += count;

      const activeRole = this.activeRoleMut();
      if (activeRole) {
        activeRole.logs.push(
          `${player.name} gains ${count} gold from ${suit} districts.`
        );
      }
    }
  }


  processTurnEnd(): Result<void> {
    try {
      switch (this.activeTurn.type) {
        case "GameOver":
          break;

        case "Draft": {
          const draft = this.activeTurn.draft;
          if (draft.theaterStep) {
            // Move to call phase
            this.activeTurn = {
              type: "Call",
              call: {
                index: 0,
                endOfRound: false,
              },
            };
          } else {
            // Move to next player in draft
            draft.player = { 0: (draft.player[0] + 1) % this.players.length };
          }
          break;
        }

        case "Call": {
          const call = this.activeTurn.call;
          if (call.endOfRound) {
            this.endRound();
          } else {
            // Check for Poor House and Park
            const player = this.activePlayer();
            const activeRole = this.activeRole();

            if (player && activeRole) {
              const role = activeRole.role;
              const poorHouse =
                role !== "Witch" &&
                player.gold === 0 &&
                player.cityHas("PoorHouse");

              const park =
                role !== "Witch" &&
                player.hand.length === 0 &&
                player.cityHas("Park");

              if (poorHouse) {
                player.gold += 1;
                activeRole.logs.push(
                  `${player.name} gains 1 gold from their Poor House.`
                );
              }

              if (park) {
                this.gainCards(2);
                activeRole.logs.push(
                  `${player.name} gains 2 cards from their Park.`
                );
              }

              // Handle Alchemist refund
              const refund = this.alchemist;
              if (refund > 0) {
                this.alchemist = 0;
                player.gold += refund;
                activeRole.logs.push(
                  `The Alchemist is refunded ${refund} gold spent building.`
                );
              }
            }

            this.callNext();
          }
          break;
        }
      }

      return this.startTurn();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  callNext(): void {
    if (this.activeTurn.type !== "Call") return;

    const call = this.activeTurn.call;
    const nextIndex = this.characters.next(call.index);

    if (nextIndex !== undefined) {
      this.activeTurn = {
        type: "Call",
        call: {
          index: nextIndex,
          endOfRound: false,
        },
      };
    } else {
      // Check for Emperor
      const emperor = this.characters.characters.findIndex(
        (c) => c.role === "Emperor"
      );
      if (emperor >= 0) {
        this.activeTurn = {
          type: "Call",
          call: {
            index: emperor,
            endOfRound: true,
          },
        };
      } else {
        this.endRound();
      }
    }
  }


  endRound(): void {
    // Check for heir (King or Patrician that was killed)
    const heir = this.characters.characters.find(
      (c) =>
        c.markers.includes("Killed") &&
        (c.role === "King" || c.role === "Patrician")
    );

    if (heir && heir.player) {
      this.crowned = heir.player;
      this.logs.push(
        `${heir.role}'s heir ${this.players[this.crowned[0]].name} crowned.`
      );
    }

    // Check for game over
    if (this.firstToComplete !== null) {
      this.activeTurn = { type: "GameOver" };
      return;
    }

    // Clean up the round
    this.cleanupRound();

    // Begin next draft
    this.beginDraft();
  }

  cleanupRound(): void {
    this.characters.cleanupRound();
    for (const player of this.players) {
      player.cleanupRound();
    }
  }

  beginDraft(): void {
    this.activeTurn = {
      type: "Draft",
      draft: beginDraft(this.players.length, this.crowned, ROLE_NAMES),
    };
  }
}
*/
