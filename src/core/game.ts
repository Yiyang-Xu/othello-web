import { createInitialBoard, countPieces } from "./board";
import { applyMove, listLegalMoves, opponent } from "./rules";
import { BLACK, type Cell, type GameStatus, type Player } from "./types";

export interface GameState {
  board: Cell[];
  current: Player;
  status: GameStatus;
  lastMove: number | null;
  lastFlipped: number[];
  message: string;
}

export function newGame(): GameState {
  return {
    board: createInitialBoard(),
    current: BLACK,
    status: "playing",
    lastMove: null,
    lastFlipped: [],
    message: "",
  };
}

export function getScore(state: GameState) {
  return countPieces(state.board);
}

export function getLegalMoves(state: GameState) {
  return listLegalMoves(state.board, state.current);
}

/**
 * 尝试落子：合法则执行并自动处理“对手无棋可走 -> 跳过”，以及终局判定
 */
export function tryPlay(state: GameState, idx: number): GameState {
  if (state.status === "gameover") return state;

  const legal = listLegalMoves(state.board, state.current);
  if (!legal.includes(idx)) {
    return { ...state, message: "非法落子：必须夹住对方棋子。" };
  }

  const { nextBoard, flipped } = applyMove(state.board, idx, state.current);
  let nextPlayer = opponent(state.current);

  // 检查对手是否有合法步
  const oppMoves = listLegalMoves(nextBoard, nextPlayer);

  // 如果对手无步可走，当前玩家继续（跳过对手）
  if (oppMoves.length === 0) {
    const curMoves = listLegalMoves(nextBoard, state.current);
    // 双方都无步可走 -> 结束
    if (curMoves.length === 0) {
      return gameOver({
        ...state,
        board: nextBoard,
        current: nextPlayer,
        lastMove: idx,
        lastFlipped: flipped,
        message: "双方均无合法落子，游戏结束。",
      });
    }
    // 对手跳过
    return {
      ...state,
      board: nextBoard,
      current: state.current,
      lastMove: idx,
      lastFlipped: flipped,
      message: "对手无合法落子，自动跳过（你继续）。",
    };
  }

  // 正常换手
  return {
    ...state,
    board: nextBoard,
    current: nextPlayer,
    lastMove: idx,
    lastFlipped: flipped,
    message: "",
  };
}

function gameOver(state: GameState): GameState {
  const { black, white } = countPieces(state.board);
  let msg = `结束：黑 ${black} - 白 ${white}。`;
  if (black > white) msg += " 黑胜！";
  else if (white > black) msg += " 白胜！";
  else msg += " 平局！";
  return { ...state, status: "gameover", message: msg };
}
