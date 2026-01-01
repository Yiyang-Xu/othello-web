import { inBounds, idxToRC, rcToIdx } from "./board";
import { BLACK, WHITE, type Cell, type Player } from "./types";

const DIRS = [
  { dr: -1, dc: 0 },  // N
  { dr: 1, dc: 0 },   // S
  { dr: 0, dc: -1 },  // W
  { dr: 0, dc: 1 },   // E
  { dr: -1, dc: -1 }, // NW
  { dr: -1, dc: 1 },  // NE
  { dr: 1, dc: -1 },  // SW
  { dr: 1, dc: 1 },   // SE
] as const;

export function opponent(p: Player): Player {
  return (p === BLACK ? WHITE : BLACK);
}

/**
 * 返回在 idx 落子后会被翻转的所有位置（不包含 idx 本身）
 * 如果返回空数组，说明不是合法落子。
 */
export function getFlips(board: Cell[], idx: number, player: Player): number[] {
  if (board[idx] !== 0) return [];
  const { r, c } = idxToRC(idx);
  const opp = opponent(player);
  const flips: number[] = [];

  for (const { dr, dc } of DIRS) {
    let rr = r + dr;
    let cc = c + dc;

    // 第一步必须是对方棋子，否则这一方向不可能翻
    if (!inBounds(rr, cc)) continue;
    const first = board[rcToIdx(rr, cc)];
    if (first !== opp) continue;

    // 收集连续对方棋子
    const line: number[] = [rcToIdx(rr, cc)];
    rr += dr; cc += dc;

    while (inBounds(rr, cc)) {
      const curIdx = rcToIdx(rr, cc);
      const cur = board[curIdx];

      if (cur === opp) {
        line.push(curIdx);
        rr += dr; cc += dc;
        continue;
      }

      // 遇到自己的子 -> 成功夹住，line 可翻
      if (cur === player) {
        flips.push(...line);
      }
      // 遇到空格 or 出界 -> 失败，不翻
      break;
    }
  }

  return flips;
}

export function isLegalMove(board: Cell[], idx: number, player: Player): boolean {
  return getFlips(board, idx, player).length > 0;
}

export function listLegalMoves(board: Cell[], player: Player): number[] {
  const moves: number[] = [];
  for (let i = 0; i < 64; i++) {
    if (board[i] === 0 && getFlips(board, i, player).length > 0) moves.push(i);
  }
  return moves;
}

export function applyMove(board: Cell[], idx: number, player: Player): { nextBoard: Cell[], flipped: number[] } {
  const flips = getFlips(board, idx, player);
  if (flips.length === 0) {
    return { nextBoard: board.slice(), flipped: [] };
  }
  const next = board.slice();
  next[idx] = player;
  for (const f of flips) next[f] = player;
  return { nextBoard: next, flipped: flips };
}
