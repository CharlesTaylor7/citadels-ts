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
import { performAction } from "./game-actions";
import { Lobby } from "./lobby";
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

  constructor(deck: T[]) {
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
  roles: RoleName[]
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

  constructor(roles: RoleName[]) {
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
 * Game state
 */
export class Game {
  players: Player[];
  characters: Characters;
  deck: Deck<DistrictName>;
  museum: Museum;
  logs: string[];
  activeTurn: Turn;
  crowned: PlayerIndex;
  taxCollector: number;
  alchemist: number;
  firstToComplete: PlayerIndex | null;
  followup: Followup | null;
  notifications: Notification[];

  /**
   * Create a new game
   */
  constructor(lobby: Lobby) {
    // Initialize players
    this.players = lobby.players.map((player, index) =>
      createPlayer({ 0: index }, player.id, player.name)
    );

    // Initialize characters
    this.characters = new Characters(ROLE_NAMES);

    // Initialize deck with all district cards
    this.deck = new Deck<DistrictName>(DISTRICT_NAMES);
    this.deck.shuffle();

    // Initialize museum
    this.museum = new Museum();

    // Initialize other state
    this.logs = [];
    this.crowned = { 0: 0 }; // First player is crowned initially
    this.taxCollector = 0;
    this.alchemist = 0;
    this.firstToComplete = null;
    this.followup = null;
    this.notifications = [];

    // Deal initial cards
    for (const player of this.players) {
      player.hand = this.deck.drawMany(4);
    }

    // Start with draft phase
    this.activeTurn = {
      type: "Draft",
      draft: beginDraft(this.players.length, this.crowned, ROLE_NAMES),
    };
  }

  /**
   * Get the active player
   */
  activePlayer(): Player | undefined {
    const activeRole = this.activeRole();
    if (!activeRole || activeRole.player === null) {
      return undefined;
    }
    return this.players[activeRole.player[0]];
  }

  /**
   * Get a mutable reference to the active player
   */
  activePlayerMut(): Player | undefined {
    return this.activePlayer();
  }

  /**
   * Get the active role
   */
  activeRole(): Character | undefined {
    if (this.activeTurn.type === "Call") {
      return this.characters.characters[this.activeTurn.call.index];
    }
    return undefined;
  }

  /**
   * Get a mutable reference to the active role
   */
  activeRoleMut(): Character | undefined {
    return this.activeRole();
  }

  /**
   * Complete a build action
   */
  completeAction(
    playerIndex: PlayerIndex,
    cost: number,
    district: DistrictName
  ): void {
    const player = this.players[playerIndex[0]];
    player.gold -= cost;

    // Remove from hand
    const index = player.hand.findIndex((d) => d === district);
    if (index >= 0) {
      player.hand.splice(index, 1);
    }

    // Add to city
    player.city.push(createCityDistrict(district));

    // Track alchemist refund
    if (this.activeRole()?.role === "Alchemist") {
      this.alchemist += cost;
    }

    // Check for first to complete
    if (this.firstToComplete === null && player.city.length >= 8) {
      this.firstToComplete = playerIndex;
    }
  }

  /**
   * Discard a district
   */
  discardDistrict(district: DistrictName): void {
    this.deck.discardToBottom(district);
  }

  /**
   * Perform an action
   */
  performAction(action: ActionSubmission): ActionResult {
    return performAction(this, action);
  }

  /**
   * Gain cards for the active player
   */
  gainCards(amount: number): void {
    const player = this.activePlayerMut();
    if (!player) return;

    const cards = this.deck.drawMany(amount);
    player.hand.push(...cards);

    const activeRole = this.activeRoleMut();
    if (activeRole) {
      activeRole.logs.push(`${player.name} gains ${amount} cards.`);
    }
  }

  /**
   * Choose a card from a selection
   */
  chooseCard(card: DistrictName, selection: DistrictName[]): void {
    const player = this.activePlayerMut();
    if (!player) return;

    // Add chosen card to hand
    player.hand.push(card);

    // Discard the rest
    for (const district of selection) {
      if (district !== card) {
        this.discardDistrict(district);
      }
    }

    const activeRole = this.activeRoleMut();
    if (activeRole) {
      activeRole.logs.push(`${player.name} chooses a card.`);
    }
  }

  /**
   * Start a new turn
   */
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
              draft.initialDiscard = null;
              draft.remaining.push(initial);
            }

            // If no more roles to draft, move to theater step
            if (draft.remaining.length === 0) {
              draft.theaterStep = true;

              // Check for Theater
              for (let i = 0; i < this.players.length; i++) {
                const player = this.players[i];
                if (player.cityHas("Theater")) {
                  // Allow player to swap roles
                  return {
                    success: true,
                    value: undefined,
                  };
                }
              }
            }
          }
          break;
        }

        case "Call": {
          const call = this.activeTurn.call;
          const character = this.characters.characters[call.index];

          // Skip characters with no player
          if (character.player === null) {
            this.callNext();
            return this.startTurn();
          }

          // Check for bewitched
          if (character.markers.includes("Bewitched")) {
            const index = character.markers.indexOf("Bewitched");
            if (index >= 0) {
              character.markers.splice(index, 1);
            }

            // Skip bewitched character's turn
            this.callNext();
            return this.startTurn();
          }

          // Check for killed
          if (character.markers.includes("Killed")) {
            const index = character.markers.indexOf("Killed");
            if (index >= 0) {
              character.markers.splice(index, 1);
            }

            // Skip killed character's turn
            this.callNext();
            return this.startTurn();
          }

          // Set up available actions for the character
          character.actions = [];

          // Add gather action
          character.actions.push({
            action: "Gather",
            resource: "Gold",
          });

          character.actions.push({
            action: "Gather",
            resource: "Cards",
          });

          // Add role-specific actions
          const roleData = ROLE_NAMES.find((name) => name === character.role);
          if (roleData) {
            // Here we would add role-specific actions based on the character
            // This would be implemented based on the specific role
            switch (character.role) {
              case "Assassin":
                // Add assassin actions
                character.actions.push({
                  action: "Kill",
                  role: null,
                });
                break;

              case "Thief":
                // Add thief actions
                character.actions.push({
                  action: "Steal",
                  role: null,
                });
                break;

              case "Magician":
                // Add magician actions
                character.actions.push({
                  action: "Magician",
                  magicianAction: null,
                });
                break;

              case "King":
                // Add king actions
                // King gets crown and resources for noble districts
                this.crowned = character.player;
                this.gainResourcesForSuit("Noble");
                break;

              case "Bishop":
                // Add bishop actions
                // Bishop gets resources for religious districts
                this.gainResourcesForSuit("Religious");
                break;

              case "Merchant":
                // Add merchant actions
                // Merchant gets 1 gold and resources for trade districts
                const player = this.players[character.player[0]];
                player.gold += 1;
                character.logs.push(
                  `${player.name} gains 1 gold as the Merchant.`
                );
                this.gainResourcesForSuit("Trade");
                break;

              case "Architect":
                // Add architect actions
                // Architect draws 2 cards
                this.gainCards(2);
                break;

              case "Warlord":
                // Add warlord actions
                // Warlord gets resources for military districts
                this.gainResourcesForSuit("Military");
                character.actions.push({
                  action: "Destroy",
                  target: null,
                });
                break;
            }
          }

          // Add build actions
          const player = this.players[character.player[0]];
          for (const district of player.hand) {
            const data = getDistrictData(district);
            if (player.gold >= data.cost && !player.cityHas(district)) {
              character.actions.push({
                action: "Build",
                method: {
                  method: "Normal",
                  district,
                },
              });
            }
          }

          // Check for blackmail
          const blackmailerChar = this.characters.characters.find(
            (c) => c.role === "Blackmailer"
          );
          if (blackmailerChar && blackmailerChar.player !== null) {
            const blackmailMarker = character.markers.find(
              (m) =>
                typeof m === "object" && "type" in m && m.type === "Blackmail"
            );

            if (blackmailMarker) {
              character.actions.push({
                action: "PayBribe",
              });

              character.actions.push({
                action: "IgnoreBlackmail",
              });
            }
          }

          break;
        }
      }

      return { success: true, value: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Gain resources for districts of a specific suit
   */
  gainResourcesForSuit(suit: CardSuit): void {
    const player = this.activePlayerMut();
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

  /**
   * Process the end of a turn
   */
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

  /**
   * Move to the next character in the call phase
   */
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

  /**
   * End the current round
   */
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

  /**
   * Clean up the round
   */
  cleanupRound(): void {
    this.characters.cleanupRound();
    for (const player of this.players) {
      player.cleanupRound();
    }
  }

  /**
   * Begin the draft phase
   */
  beginDraft(): void {
    this.activeTurn = {
      type: "Draft",
      draft: beginDraft(this.players.length, this.crowned, ROLE_NAMES),
    };
  }
}
