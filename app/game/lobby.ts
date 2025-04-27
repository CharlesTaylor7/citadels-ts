/**
 * TypeScript port of the Citadels lobby
 * Converted from Rust implementation
 */
import { DistrictName } from './districts';
import { Rank, RANKS, RoleName } from './roles';
import { PlayerId } from './types';
import { ROLES } from './characters';

/**
 * Represents a player in the game
 */
export interface Player {
  id: PlayerId;
  name: string;
}

/**
 * Utility functions for Player
 */
export const PlayerUtils = {
  /**
   * Create a demo player
   * @param name The player's name
   * @returns A new player object
   */
  demo(name: string): Player {
    return {
      id: name,
      name: name,
    };
  }
};

/**
 * Represents the game lobby
 */
export interface Lobby {
  players: Player[];
  config: GameConfig;
}

/**
 * Utility functions for Lobby
 */
export const LobbyUtils = {
  /**
   * Create a demo lobby with a specified number of players
   * @param count The number of players
   * @returns A new lobby object
   */
  demo(count: number): Lobby {
    const players = [
      'Alph',
      'Brittany',
      'Charlie',
      'Dana',
      'Eli',
      'Francesca',
      'George',
      'Helen',
    ];

    return {
      config: GameConfigUtils.default(),
      players: players
        .slice(0, count)
        .map((p, i) => ({
          id: `${i + 1}`,
          name: p,
        })),
    };
  },

  /**
   * Register a player in the lobby
   * @param lobby The lobby to register in
   * @param id The player's ID
   * @param name The player's name
   * @returns A Result object indicating success or failure
   */
  register(lobby: Lobby, id: string, name: string): Result<void> {
    // Check if username is taken
    if (lobby.players.some(p => p.id !== id && p.name === name)) {
      return { success: false, error: "username taken" };
    }

    // Find existing player with this ID
    const existingPlayerIndex = lobby.players.findIndex(p => p.id === id);
    
    if (existingPlayerIndex >= 0) {
      // Update existing player's name
      lobby.players[existingPlayerIndex].name = name;
    } else {
      // Add new player
      lobby.players.push({
        id: id,
        name: name,
      });
    }
    
    return { success: true, value: undefined };
  }
};

/**
 * Configuration options for game elements
 */
export const CONFIG_OPTIONS = [
  'Sometimes',
  'Always',
  'Never'
] as const;

export type ConfigOption = typeof CONFIG_OPTIONS[number];

/**
 * Game configuration settings
 */
export interface GameConfig {
  roleAnarchy: boolean;
  roles: Set<RoleName>;
  districts: Map<DistrictName, ConfigOption>;
}

/**
 * Utility functions for GameConfig
 */
export const GameConfigUtils = {
  /**
   * Create default game configuration
   * @returns A new game configuration object
   */
  default(): GameConfig {
    const roles = new Set<RoleName>();
    
    // Add all roles
    for (const role of ROLES.map(r => r.name)) {
      roles.add(role);
    }

    return {
      roleAnarchy: false,
      roles,
      districts: new Map(),
    };
  },

  /**
   * Set the enabled roles for the game
   * @param config The game configuration
   * @param roles The set of roles to enable
   * @returns A Result object indicating success or failure
   */
  setRoles(config: GameConfig, roles: Set<RoleName>): Result<void, [Set<RoleName>, Set<Rank>]> {
    const errorRanks = new Set<Rank>();
    
    // Check if any rank has all its roles disabled
    for (let i = 0; i < ROLES.length; i += 3) {
      const chunk = ROLES.slice(i, i + 3);
      if (chunk.every(c => !roles.has(c.name))) {
        errorRanks.add(chunk[0].rank);
      }
    }
    
    if (errorRanks.size > 0) {
      return { success: false, error: [roles, errorRanks] };
    }
    
    config.roles = roles;
    return { success: true, value: undefined };
  },

  /**
   * Create a configuration with the base set of roles
   * @returns A new game configuration with base roles
   */
  baseSet(): GameConfig {
    const baseRoles: RoleName[] = [
      'Assassin',
      'Thief',
      'Magician',
      'King',
      'Bishop',
      'Merchant',
      'Architect',
      'Warlord',
      'Artist',
    ];
    
    const roles = new Set<RoleName>(baseRoles);
    
    return {
      roleAnarchy: false,
      roles,
      districts: new Map(),
    };
  },

  /**
   * Check if a role is enabled in the configuration
   * @param config The game configuration
   * @param role The role to check
   * @returns True if the role is enabled, false otherwise
   */
  roleEnabled(config: GameConfig, role: RoleName): boolean {
    return config.roles.has(role);
  },

  /**
   * Get the configuration option for a district
   * @param config The game configuration
   * @param district The district to check
   * @returns The configuration option for the district
   */
  district(config: GameConfig, district: DistrictName): ConfigOption {
    return config.districts.get(district) || 'Sometimes';
  },

  /**
   * Select roles for the game based on configuration and player count
   * @param config The game configuration
   * @param rng Random number generator
   * @param numPlayers Number of players
   * @returns A Result object with the selected roles
   */
  selectRoles(config: GameConfig, rng: () => number, numPlayers: number): Result<RoleName[]> {
    // 9th rank is disallowed for 2
    // 9th rank is required for 3
    // 9th rank is optional for 4-7
    // 9th rank is required for 8
    const roleCount = numPlayers === 2 ? 8 : 9;
    console.info(`Selecting ${roleCount} roles for ${numPlayers} player game`);

    if (config.roleAnarchy) {
      // Filter roles by player count and enabled status
      const eligibleRoles = ROLES
        .map(r => r.name)
        .filter(r => {
          const minPlayerCount = RoleNameUtils.minPlayerCount(r);
          return numPlayers >= minPlayerCount && GameConfigUtils.roleEnabled(config, r);
        });

      // Randomly select roles
      return { 
        success: true, 
        value: this.chooseMultiple(eligibleRoles, roleCount, rng) 
      };
    } else {
      // Group roles by rank
      const groupedByRank: RoleName[][] = Array(roleCount).fill(null).map(() => []);
      
      for (const r of ROLES) {
        const minPlayerCount = RoleNameUtils.minPlayerCount(r.name);
        if (numPlayers >= minPlayerCount && GameConfigUtils.roleEnabled(config, r.name)) {
          const rankIndex = RankUtils.toIndex(r.rank);
          groupedByRank[rankIndex].push(r.name);
        }
      }

      // Select one role from each rank
      const result: RoleName[] = [];
      
      for (let i = 0; i < groupedByRank.length; i++) {
        const roles = groupedByRank[i];
        if (roles.length === 0) {
          return { 
            success: false, 
            error: `No enabled roles for rank ${i + 1}` 
          };
        }
        
        const selectedRole = this.choose(roles, rng);
        result.push(selectedRole);
      }
      
      return { success: true, value: result };
    }
  },

  /**
   * Select unique districts for the game based on configuration
   * @param config The game configuration
   * @param rng Random number generator
   * @returns An array of selected district names
   */
  selectUniqueDistricts(config: GameConfig, rng: () => number, uniqueDistricts: DistrictName[]): DistrictName[] {
    const always: DistrictName[] = [];
    const sometimes: DistrictName[] = [];
    
    for (const district of uniqueDistricts) {
      const option = GameConfigUtils.district(config, district);
      if (option === 'Always') {
        always.push(district);
      } else if (option === 'Sometimes') {
        sometimes.push(district);
      }
      // 'Never' districts are ignored
    }
    
    if (always.length < 14) {
      shuffle(sometimes, rng);
    }
    
    return [...always, ...sometimes].slice(0, 14);
  },

  /**
   * Choose a random item from an array
   * @param items Array of items to choose from
   * @param rng Random number generator
   * @returns A randomly selected item
   */
  choose<T>(items: T[], rng: () => number): T {
    const index = Math.floor(rng() * items.length);
    return items[index];
  },

  /**
   * Choose multiple random items from an array
   * @param items Array of items to choose from
   * @param count Number of items to select
   * @param rng Random number generator
   * @returns Array of randomly selected items
   */
  chooseMultiple<T>(items: T[], count: number, rng: () => number): T[] {
    const result: T[] = [];
    const available = [...items];
    
    for (let i = 0; i < count && available.length > 0; i++) {
      const index = Math.floor(rng() * available.length);
      result.push(available[index]);
      available.splice(index, 1);
    }
    
    return result;
  },

 
};

/**
 * Generic result type for operations that can fail
 */
export interface SuccessResult<T> {
  success: true;
  value: T;
}

export interface ErrorResult<E = string> {
  success: false;
  error: E;
}

export type Result<T, E = string> = SuccessResult<T> | ErrorResult<E>;

// Import these from roles.ts once they're implemented
// Temporary placeholders to make the file compile
const RoleNameUtils = {
  minPlayerCount: (role: RoleName): number => {
    switch (role) {
      case 'Queen':
        return 5;
      case 'Emperor':
      case 'Artist':
      case 'TaxCollector':
        return 3;
      default:
        return 0;
    }
  }
};

const RankUtils = {
  toIndex: (rank: Rank): number => RANKS.indexOf(rank) 
};
