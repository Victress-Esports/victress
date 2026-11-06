// Launch game is a single config value. Switch NEXT_PUBLIC_LAUNCH_GAME to CS2 later.
export type GameId = "VALORANT" | "CS2";

export interface GameConfig {
  id: GameId;
  name: string;
  roles: string[];
  ranks: string[];
}

export const GAMES: Record<GameId, GameConfig> = {
  VALORANT: {
    id: "VALORANT",
    name: "VALORANT",
    roles: ["Duelist", "Initiator", "Controller", "Sentinel", "Flex"],
    ranks: ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Ascendant", "Immortal", "Radiant"],
  },
  CS2: {
    id: "CS2",
    name: "Counter-Strike 2",
    roles: ["Entry", "AWPer", "Support", "Lurker", "In-game leader"],
    ranks: ["Silver", "Gold Nova", "Master Guardian", "Legendary Eagle", "Supreme", "Global Elite"],
  },
};

export function launchGame(): GameConfig {
  const id = (process.env.NEXT_PUBLIC_LAUNCH_GAME ?? "VALORANT").toUpperCase();
  return id in GAMES ? GAMES[id as GameId] : GAMES.VALORANT;
}
