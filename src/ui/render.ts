import type { GameState } from "../core/game";
import { getLegalMoves, getScore, tryPlay } from "../core/game";
import { BLACK, WHITE, type Cell } from "../core/types";
import { getFlips } from "../core/rules";

export function mountApp(root: HTMLElement, initial: GameState) {
  let state = initial;

  // ✅ NEW: hover preview state
  let hoverIdx: number | null = null;

  root.innerHTML = `
    <div class="container">
      <header class="topbar">
        <div>
          <h1 class="title">Othello</h1>
          <div class="subtitle">Web Prototype</div>
        </div>
        <div class="actions">
          <button id="restartBtn" class="btn">Restart</button>
        </div>
      </header>

      <section class="hud">
        <div class="pill" id="turnPill"></div>
        <div class="pill" id="scorePill"></div>
        <div class="pill" id="legalPill"></div>
      </section>

      <section class="main">
        <div id="board" class="board" aria-label="Othello board"></div>
        <div class="message" id="msg"></div>
      </section>
    </div>
  `;

  const boardEl = root.querySelector<HTMLDivElement>("#board")!;
  const turnPill = root.querySelector<HTMLDivElement>("#turnPill")!;
  const scorePill = root.querySelector<HTMLDivElement>("#scorePill")!;
  const legalPill = root.querySelector<HTMLDivElement>("#legalPill")!;
  const msgEl = root.querySelector<HTMLDivElement>("#msg")!;
  const restartBtn = root.querySelector<HTMLButtonElement>("#restartBtn")!;

  // 创建 64 个 cell（只创建一次，后续更新 class）
  const cells: HTMLButtonElement[] = [];
  for (let i = 0; i < 64; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.type = "button";
    cell.dataset.idx = String(i);

    // ✅ NEW: hover handlers (mouse + keyboard focus)
    const setHover = () => {
      if (state.status === "gameover") return;
      hoverIdx = i;
      render();
    };
    const clearHover = () => {
      hoverIdx = null;
      render();
    };
    cell.addEventListener("mouseenter", setHover);
    cell.addEventListener("mouseleave", clearHover);
    cell.addEventListener("focus", setHover);
    cell.addEventListener("blur", clearHover);

    cell.addEventListener("click", () => {
      state = tryPlay(state, i);
      hoverIdx = null; // ✅ NEW: click 后清掉 hover
      render();
    });
    cells.push(cell);
    boardEl.appendChild(cell);
  }

  restartBtn.addEventListener("click", () => {
    // 动态 import 避免循环依赖
    import("../core/game").then(({ newGame }) => {
      state = newGame();
      hoverIdx = null; // ✅ NEW: 重开后清掉 hover
      render();
    });
  });

  function renderCell(cellEl: HTMLButtonElement, idx: number, cell: Cell, legalSet: Set<number>, previewTarget: number | null, previewFlipSet: Set<number>) {
    cellEl.classList.toggle("last", state.lastMove === idx);
    cellEl.classList.toggle("flipped", state.lastFlipped.includes(idx));

    // ✅ NEW: preview classes
    cellEl.classList.toggle("preview-target", previewTarget === idx);
    cellEl.classList.toggle("preview-flip", previewFlipSet.has(idx));

    // 清空内容
    cellEl.innerHTML = "";

    // 棋子
    if (cell === BLACK || cell === WHITE) {
      const piece = document.createElement("div");
      piece.className = `piece ${cell === BLACK ? "black" : "white"}`;
      cellEl.appendChild(piece);
      return;
    }

    // 空格：合法落子提示点
    if (legalSet.has(idx) && state.status !== "gameover") {
      const hint = document.createElement("div");
      hint.className = "hint";
      cellEl.appendChild(hint);
    }
  
  // ✅ NEW: hover 时在目标格显示 ghost piece
    if (previewTarget === idx && legalSet.has(idx) && state.status !== "gameover") {
      const ghost = document.createElement("div");
      ghost.className = `piece ghost ${state.current === BLACK ? "black" : "white"}`;
      cellEl.appendChild(ghost);
    }
  }

  function render() {
    const legal = getLegalMoves(state);
    const legalSet = new Set(legal);
    const score = getScore(state);

    // ✅ NEW: 计算 hover preview flips
    let previewTarget: number | null = null;
    let previewFlipSet = new Set<number>();

    if (hoverIdx !== null && legalSet.has(hoverIdx) && state.status !== "gameover") {
      const flips = getFlips(state.board, hoverIdx, state.current);
      if (flips.length > 0) {
        previewTarget = hoverIdx;
        previewFlipSet = new Set(flips);
      }
    }

    const turnText = state.current === BLACK ? "Black to move" : "White to move";
    turnPill.textContent = state.status === "gameover" ? "Game Over" : turnText;

    scorePill.textContent = `Black ${score.black}  ·  White ${score.white}`;
    legalPill.textContent = `Legal moves: ${legal.length}`;

    msgEl.textContent = state.message || (state.status === "gameover" ? "Click Restart to play again." : "");

    // 更新棋盘格子
    for (let i = 0; i < 64; i++) {
      renderCell(cells[i], i, state.board[i], legalSet, previewTarget, previewFlipSet);
    }
  }

  render();
}
