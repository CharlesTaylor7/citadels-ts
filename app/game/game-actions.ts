/**
 * TypeScript port of the Citadels game actions
 * Converted from Rust implementation
 */
import {
  Action,
  ActionTag,
  BuildMethod,
  CityDistrictTarget,
  MagicianAction,
  Resource,
  WizardMethod,
} from "./actions";
import { DistrictName } from "./districts";
import { RoleName } from "./roles";
import { Marker } from "./types";

/**
 * Game-related types needed for action handling
 */

// These types would normally be imported from a game.ts file
// For now, we'll define them here as placeholders
export interface Player {
  gold: number;
  hand: DistrictName[];
  city: CityDistrict[];
  name: string;
  index: PlayerIndex;
  cityHas(district: DistrictName): boolean;
}

export interface Character {
  markers: Marker[];
  player?: PlayerIndex;
  hasWarrant(): boolean;
}

export interface Characters {
  get(role: RoleName): Character | undefined;
  getMut(role: RoleName): Character | undefined;
  hasTaxCollector(): boolean;
}

export interface CityDistrict {
  name: DistrictName;
  beautified: boolean;
}

export type PlayerIndex = { 0: number };

export type Followup =
  | {
      type: "Warrant";
      magistrate: PlayerIndex;
      gold: number;
      district: DistrictName;
      signed: boolean;
    }
  | { type: "Blackmail"; blackmailer: PlayerIndex };

export interface Game {
  players: Player[];
  characters: Characters;
  followup?: Followup;
  taxCollector: number;
  turnActions: Action[];
  activePlayer(): Player | undefined;
  activeRole(): Character | undefined;
  completeAction(
    playerIndex: PlayerIndex,
    cost: number,
    district: DistrictName
  ): void;
  discardDistrict(district: DistrictName): void;
}

export interface ActionOutput {
  message: string;
  followup?: Followup;
  endTurn: boolean;
}

export type ActionResult = Result<ActionOutput>;
export type Result<T> =
  | { success: true; value: T }
  | { success: false; error: string };

/**
 * Create a new action output
 * @param message The message to display
 * @returns An action output object
 */
function createActionOutput(message: string): ActionOutputBuilder {
  return new ActionOutputBuilder(message);
}

/**
 * Builder for action outputs
 */
class ActionOutputBuilder {
  private output: ActionOutput;

  constructor(message: string) {
    this.output = {
      message,
      endTurn: false,
    };
  }

  /**
   * Add a followup to the action output
   * @param followup The followup to add
   * @returns This builder
   */
  withFollowup(followup: Followup): ActionOutputBuilder {
    this.output.followup = followup;
    return this;
  }

  /**
   * Mark the action as ending the turn
   * @returns This builder
   */
  endTurn(): ActionOutputBuilder {
    this.output.endTurn = true;
    return this;
  }

  /**
   * Build the action output
   * @returns The action output
   */
  build(): ActionOutput {
    return this.output;
  }
}

/**
 * Helper function to remove the first occurrence of an item from an array
 * @param array The array to remove from
 * @param item The item to remove
 * @returns The removed item, or undefined if not found
 */
function removeFirst<T>(
  array: T[],
  predicate: (item: T) => boolean
): T | undefined {
  const index = array.findIndex(predicate);
  if (index >= 0) {
    return array.splice(index, 1)[0];
  }
  return undefined;
}

/**
 * Perform a game action
 * @param game The game state
 * @param action The action to perform
 * @returns The result of the action
 */
export function performAction(game: Game, action: Action): ActionResult {
  try {
    // This is a simplified version of the original function
    // The full implementation would handle all action types

    switch (action.action) {
      case "RevealWarrant": {
        if (!game.followup || game.followup.type !== "Warrant") {
          return { success: false, error: "Cannot reveal warrant" };
        }

        const { magistrate, gold, district, signed } = game.followup;

        if (!signed) {
          return { success: false, error: "Cannot reveal unsigned warrant" };
        }

        if (game.players[magistrate[0]].cityHas(district)) {
          return {
            success: false,
            error: "Cannot confiscate a district you already have.",
          };
        }

        const player = game.activePlayerMut();
        if (!player) {
          return { success: false, error: "No active player" };
        }

        player.gold += gold;
        const magistratePlayer = game.players[magistrate[0]];
        magistratePlayer.city.push({ name: district, beautified: false });
        const name = magistratePlayer.name;

        // Clear all remaining warrants
        for (const character of Object.values(game.characters)) {
          const index = character.markers.findIndex(
            (m) => typeof m === "object" && "type" in m && m.type === "Warrant"
          );
          if (index >= 0) {
            character.markers.splice(index, 1);
          }
        }

        return {
          success: true,
          value: createActionOutput(
            `The Magistrate (${name}) reveals a signed warrant and confiscates the ${district}; ${gold} gold is refunded.`
          ).build(),
        };
      }

      case "PayBribe": {
        const blackmailerChar = game.characters.get("Blackmailer");
        if (!blackmailerChar || !blackmailerChar.player) {
          return { success: false, error: "No blackmailer" };
        }

        const blackmailer = blackmailerChar.player;
        const player = game.activePlayerMut();
        if (!player) {
          return { success: false, error: "No active player" };
        }

        const half = Math.floor(player.gold / 2);
        player.gold -= half;
        game.players[blackmailer[0]].gold += half;

        return {
          success: true,
          value: createActionOutput(
            `They bribed the Blackmailer (${game.players[blackmailer[0]].name}) with ${half} gold.`
          ).build(),
        };
      }

      case "IgnoreBlackmail": {
        const blackmailerChar = game.characters.get("Blackmailer");
        if (!blackmailerChar || !blackmailerChar.player) {
          return { success: false, error: "No blackmailer" };
        }

        const blackmailer = blackmailerChar.player;

        return {
          success: true,
          value: createActionOutput(
            "They ignored the blackmail. Waiting on the Blackmailer's response."
          )
            .withFollowup({ type: "Blackmail", blackmailer })
            .build(),
        };
      }

      case "RevealBlackmail": {
        if (!game.followup || game.followup.type !== "Blackmail") {
          return { success: false, error: "Cannot reveal blackmail" };
        }

        const { blackmailer } = game.followup;
        const activeRole = game.activeRole();
        if (!activeRole) {
          return { success: false, error: "No active role" };
        }

        const isFlowered = activeRole.markers.some(
          (marker) =>
            typeof marker === "object" &&
            "type" in marker &&
            marker.type === "Blackmail" &&
            marker.flowered
        );

        if (isFlowered) {
          const target = game.activePlayerMut();
          if (!target) {
            return { success: false, error: "No active player" };
          }

          const gold = target.gold;
          target.gold = 0;
          game.players[blackmailer[0]].gold += gold;

          // Clear all remaining blackmail
          for (const character of Object.values(game.characters)) {
            const index = character.markers.findIndex(
              (m) =>
                typeof m === "object" && "type" in m && m.type === "Blackmail"
            );
            if (index >= 0) {
              character.markers.splice(index, 1);
            }
          }

          return {
            success: true,
            value: createActionOutput(
              `The Blackmailer (${game.players[blackmailer[0]].name}) reveals an active threat, and takes all ${gold} of their gold.`
            ).build(),
          };
        } else {
          // Clear all remaining blackmail
          for (const character of Object.values(game.characters)) {
            const index = character.markers.findIndex(
              (m) =>
                typeof m === "object" && "type" in m && m.type === "Blackmail"
            );
            if (index >= 0) {
              character.markers.splice(index, 1);
            }
          }

          return {
            success: true,
            value: createActionOutput(
              `The Blackmailer (${game.players[blackmailer[0]].name}) reveals an inactive threat. Nothing happens.`
            ).build(),
          };
        }
      }

      case "Bewitch": {
        const role = action.role;

        if (role === "Witch") {
          return { success: false, error: "Cannot target self" };
        }

        const character = game.characters.getMut(role);
        if (!character) {
          return { success: false, error: `Role ${role} not found` };
        }

        character.markers.push("Bewitched");

        return {
          success: true,
          value: createActionOutput(`The Witch bewitches ${role}.`)
            .endTurn()
            .build(),
        };
      }

      // Add more action handlers here

      default:
        return { success: false, error: `Unhandled action: ${action.action}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
