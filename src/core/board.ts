import { BLACK, WHITE, type Cell } from "./types";

export const BOARD_SIZE = 8;

export function idxToRC(idx: number) {
  return { r: Math.floor(idx / BOARD_SIZE), c: idx % BOARD_SIZE };
}

export function rcToIdx(r: number, c: number) {
  return r * BOARD_SIZE + c;
}

export function inBounds(r: number, c: number) {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function createEmptyBoard(): Cell[] {
  return new Array<Cell>(BOARD_SIZE * BOARD_SIZE).fill(0);
}

export function createInitialBoard(): Cell[] {
  const b = createEmptyBoard();
  // 标准开局：中心四子
  // (3,3)=W, (3,4)=B, (4,3)=B, (4,4)=W
  b[rcToIdx(3, 3)] = WHITE;
  b[rcToIdx(3, 4)] = BLACK;
  b[rcToIdx(4, 3)] = BLACK;
  b[rcToIdx(4, 4)] = WHITE;
  return b;
}

export function countPieces(board: Cell[]) {
  let black = 0, white = 0, empty = 0;
  for (const cell of board) {
    if (cell === BLACK) black++;
    else if (cell === WHITE) white++;
    else empty++;
  }
  return { black, white, empty };
}
