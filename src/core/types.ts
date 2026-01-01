export type Player = 1 | -1; // 1 = Black, -1 = White
export type Cell = Player | 0;

export const BLACK: Player = 1;
export const WHITE: Player = -1;

export type GameStatus = "playing" | "gameover";

export interface Move {
  idx: number; // 0..63
}

export interface ApplyResult {
  board: Cell[];
  flipped: number[];
  placed: number;
}
