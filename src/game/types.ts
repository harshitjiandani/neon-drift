export type Lane = -1 | 0 | 1;

export type GameStatus = "ready" | "running" | "paused" | "over";

export type EntityKind = "barrier" | "block" | "gap" | "orb";

export type GameEntity = {
  id: string;
  lane: Lane;
  z: number;
  kind: EntityKind;
};

export type GameSnapshot = {
  status: GameStatus;
  score: number;
  best: number;
  shards: number;
  combo: number;
  speed: number;
  lane: Lane;
  jumpHeight: number;
  sliding: boolean;
  entities: GameEntity[];
};