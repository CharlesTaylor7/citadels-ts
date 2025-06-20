import { Marker, PlayerId } from "@/core/types";
import { RoleName } from "@/core/roles";
import { DistrictName } from "@/core/districts";
import { PRNG } from "@/server/game/random";
import { Action } from "./actions";

export interface GameState {
  players: Player[];
  characters: GameRole[];
  deck: DistrictName[];
  discard: DistrictName[];
  logs: string[];
  activeTurn: Turn;
  crowned: PlayerIndex;
  firstToComplete?: PlayerIndex;
  followup?: Followup;
  notifications: Notification[];
  museum: Museum;
  alchemist: number;
  taxCollector: number;
  prng: PRNG;
  turnActions: Action[];
  // record of all game actions
  // whole state should be recreatable by replaying this log
  actions: Action[];
}
export type Followup =
  | { type: "Bewitch" }
  | { type: "GatherCardsPick"; revealed: DistrictName[] }
  | { type: "ScholarPick"; revealed: DistrictName[] }
  | { type: "WizardPick"; player: PlayerIndex }
  | { type: "SeerDistribute"; players: PlayerIndex[] }
  | { type: "SpyAcknowledge"; player: PlayerIndex; revealed: DistrictName[] }
  | {
      type: "Warrant";
      signed: boolean;
      magistrate: PlayerIndex;
      gold: number;
      district: DistrictName;
    }
  | { type: "Blackmail"; blackmailer: PlayerIndex }
  | { type: "HandleBlackmail" };

export interface ActionOutput {
  log: string;
  followup?: Followup;
  end_turn?: boolean;
  notifications?: Notification[];
}

export type PlayerIndex = number;

export interface Player {
  index: PlayerIndex;
  id: PlayerId;
  name: string;
  gold: number;
  hand: DistrictName[];
  city: CityDistrict[];
  roles: RoleName[];
}

export interface CityDistrict {
  name: DistrictName;
  beautified: boolean;
}

export interface GameRole {
  role: RoleName;
  markers: Marker[];
  playerIndex?: PlayerIndex;
  revealed: boolean;
  logs: string[];
}

export interface Draft {
  playerCount: number;
  playerIndex: PlayerIndex;
  remaining: RoleName[];
  theaterStep: boolean;
  initialDiscard: RoleName | null;
  faceupDiscard: RoleName[];
}

export interface Call {
  index: number;
  endOfRound: boolean;
}

export type TurnType = "GameOver" | "Draft" | "Call";

export type Turn =
  | { type: "GameOver" }
  | { type: "Draft"; draft: Draft }
  | { type: "Call"; call: Call };

export interface Notification {
  message: string;
  playerIndex: PlayerIndex | null;
}

export interface Museum {
  cards: DistrictName[];
  artifacts: string[];
}
