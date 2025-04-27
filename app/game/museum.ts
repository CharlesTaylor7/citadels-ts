/**
 * Museum class for the Citadels game
 * Manages district cards and their associated artifacts
 */
export type DistrictName = string;

export class Museum {
  private cards: DistrictName[] = [];
  private artifacts: string[] = [];

  // List of all possible artifacts that can be assigned to museum cards
  private static readonly ARTIFACTS: string[] = [
    "⚱️", "🏺", "🖼️", "🗿", "🏛️", "⛲", "🕰️", "🦴", "🦾", "⚰️", "🚀", "🦖", "🦣", "🦤", "🦕",
    "💎", "🪩", "🔱", "🧋",
  ];

  constructor() {
    // Initialize with empty collections
  }

  /**
   * Get the artifacts currently assigned to cards in the museum
   * Returns only artifacts for cards that have been tucked
   */
  public getArtifacts(): string[] {
    // Return artifacts for the number of cards we have
    return this.artifacts.slice(0, this.cards.length);
  }

  /**
   * Add a new district card to the museum
   * Assigns a random artifact if needed
   * @param card The district card to add to the museum
   */
  public tuck(card: DistrictName): void {
    // Add the card to our collection
    this.cards.push(card);
    
    // If we need more artifacts, generate them
    if (this.cards.length > this.artifacts.length) {
      // Create a copy of the artifacts array
      const newArtifacts = [...Museum.ARTIFACTS];
      
      // Shuffle the artifacts (Fisher-Yates algorithm)
      shuffleArray(newArtifacts);
      
      // Add the shuffled artifacts to our collection
      this.artifacts = this.artifacts.concat(newArtifacts);
    }
  }

  /**
   * Get all cards in the museum
   */
  public getCards(): DistrictName[] {
    return [...this.cards];
  }
}

  /**
   * Helper method to shuffle an array in-place
   * Implementation of Fisher-Yates shuffle algorithm
   */
  function shuffleArray(array: string[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
