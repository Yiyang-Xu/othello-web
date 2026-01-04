import type { GameState } from "../core/game";
import { getLegalMoves, getScore, tryPlay } from "../core/game";
import { BLACK, WHITE, type Cell } from "../core/types";
import { getFlips } from "../core/rules";

type FaceColor = "black" | "white";

// ===== SFX (Web Audio) =====
let audioCtx: AudioContext | null = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playPlaceClickAt(t: number) {
  const ctx = ensureAudio();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.03);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.06);
}

function playFlipAt(t: number) {
  const ctx = ensureAudio();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(520, t);
  osc.frequency.exponentialRampToValueAtTime(260, t + 0.05);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.08);
}



export function mountApp(root: HTMLElement, initial: GameState) {
  let state = initial;

  // hover preview state
  let hoverIdx: number | null = null;

  // ✅ animation guard
  let lastAnimatedMove: number | null = null;
  let lastFlipSoundMove: number | null = null; // ✅ NEW: flip sound guard
  const flipping = new Set<number>();
  let lastPoppedMove: number | null = null; // ✅ NEW

  root.innerHTML = `
    <div class="container">
      <header class="topbar">
        <div class="actions">
          <button id="restartBtn" class="icon-btn" aria-label="Restart">
            <span class="icon" aria-hidden="true"></span>
          </button>

        </div>
      </header>

      <section class="main game-layout">
        <aside class="player-side left">
            <div class="player-card" id="p1Card">
            <div class="player-piece">
                <div class="mini-piece white"></div>
            </div>
            <div class="player-meta">
                <div class="player-score" id="p1Score">0</div>
                <div class="player-name">PLAYER 1</div>
            </div>
            </div>
            <div class="turn-text" id="p1Turn">YOUR TURN</div>
        </aside>

        <div class="board-wrap">
            <div id="board" class="board" aria-label="Othello board"></div>
        </div>

        <aside class="player-side right">
            <div class="player-card" id="p2Card">
            <div class="player-piece">
                <div class="mini-piece black"></div>
            </div>
            <div class="player-meta">
                <div class="player-score" id="p2Score">0</div>
                <div class="player-name">PLAYER 2</div>
            </div>
            </div>
            <div class="turn-text" id="p2Turn">YOUR TURN</div>
        </aside>

        <div class="message" id="msg"></div>
      </section>

    </div>
  `;

  const boardEl = root.querySelector<HTMLDivElement>("#board")!;
  const msgEl = root.querySelector<HTMLDivElement>("#msg")!;
  const restartBtn = root.querySelector<HTMLButtonElement>("#restartBtn")!;
  const p1Score = root.querySelector<HTMLDivElement>("#p1Score")!;
  const p2Score = root.querySelector<HTMLDivElement>("#p2Score")!;
  const p1Turn = root.querySelector<HTMLDivElement>("#p1Turn")!;
  const p2Turn = root.querySelector<HTMLDivElement>("#p2Turn")!;


  // UI element refs per cell
  const cells: HTMLButtonElement[] = [];
  const hints: HTMLDivElement[] = [];
  const ghosts: HTMLDivElement[] = [];
  const pieces: HTMLDivElement[] = [];
  const faceFront: HTMLDivElement[] = [];
  const faceBack: HTMLDivElement[] = [];

  function setFaceColor(el: HTMLDivElement, color: FaceColor) {
    el.classList.toggle("black", color === "black");
    el.classList.toggle("white", color === "white");
  }

  function show(el: HTMLElement, on: boolean) {
    el.style.display = on ? "" : "none";
  }

  for (let i = 0; i < 64; i++) {
    const cellBtn = document.createElement("button");
    cellBtn.className = "cell";
    cellBtn.type = "button";
    cellBtn.dataset.idx = String(i);

    const setHover = () => {
      if (state.status === "gameover") return;
      hoverIdx = i;
      render();
    };
    const clearHover = () => {
      hoverIdx = null;
      render();
    };

    cellBtn.addEventListener("mouseenter", setHover);
    cellBtn.addEventListener("mouseleave", clearHover);

    cellBtn.addEventListener("click", () => {
      // 先判断这一步是否会改变 lastMove（即确实落子）
      const prevLastMove = state.lastMove;
      state = tryPlay(state, i);
      hoverIdx = null;
      const moved = state.lastMove !== null && state.lastMove !== prevLastMove;

      if (moved) {
          const ctx = ensureAudio();        // ✅ 在用户手势内解锁
          const t0 = ctx.currentTime;

          // 1) 落子 click 立刻
          playPlaceClickAt(t0);

          // 2) 如果有翻转：70ms 后 flip（在手势内“预定”）
          if (state.lastFlipped.length > 0) {
          playFlipAt(t0 + 0.07);
        }
      }

      render();
    });

    // hint (always exists)
    const hint = document.createElement("div");
    hint.className = "hint";

    // ghost (always exists)
    const ghost = document.createElement("div");
    ghost.className = "piece ghost"; // 复用piece尺寸

    // piece (always exists): front/back faces
    const piece = document.createElement("div");
    piece.className = "piece";

    const front = document.createElement("div");
    front.className = "face front black"; // init

    const back = document.createElement("div");
    back.className = "face back black"; // init

    piece.appendChild(front);
    piece.appendChild(back);

    // mount
    cellBtn.appendChild(hint);
    cellBtn.appendChild(ghost);
    cellBtn.appendChild(piece);

    // save refs
    cells.push(cellBtn);
    hints.push(hint);
    ghosts.push(ghost);
    pieces.push(piece);
    faceFront.push(front);
    faceBack.push(back);

    boardEl.appendChild(cellBtn);
  }

  restartBtn.addEventListener("click", () => {
    import("../core/game").then(({ newGame }) => {
      state = newGame();
      hoverIdx = null;
      lastAnimatedMove = null;
      flipping.clear();
      lastPoppedMove = null; // ✅ NEW
      lastFlipSoundMove = null;
      render();
    });
  });

  function startFlip(idx: number, from: FaceColor, to: FaceColor) {
    const piece = pieces[idx];
    const front = faceFront[idx];
    const back = faceBack[idx];

    // 如果正在翻，就不要重复触发
    if (flipping.has(idx)) return;

    flipping.add(idx);

    // 设置正反两面颜色：front=旧色, back=新色
    setFaceColor(front, from);
    setFaceColor(back, to);

    // 重新触发动画（保证同一元素可重复播放）
    piece.classList.remove("flip-anim");
    // 强制 reflow
    void piece.offsetWidth;
    piece.classList.add("flip-anim");

    piece.addEventListener(
      "animationend",
      () => {
        piece.classList.remove("flip-anim");
        // 动画结束后固定为新色（front/back都设成新色）
        setFaceColor(front, to);
        setFaceColor(back, to);
        flipping.delete(idx);
      },
      { once: true }
    );
  }

  function render() {
    const legal = getLegalMoves(state);
    const legalSet = new Set(legal);
    const score = getScore(state);

    // Player 1 = WHITE, Player 2 = BLACK
    p1Score.textContent = String(score.white);
    p2Score.textContent = String(score.black);

    // YOUR TURN blink
    const p1Active = state.current === WHITE && state.status !== "gameover";
    const p2Active = state.current === BLACK && state.status !== "gameover";

    p1Turn.classList.toggle("active", p1Active);
    p2Turn.classList.toggle("active", p2Active);

    // game over: hide both turn prompts
    if (state.status === "gameover") {
        p1Turn.classList.remove("active");
        p2Turn.classList.remove("active");
    }

    // hover preview flips + target color
    let previewTarget: number | null = null;
    let previewFlipSet = new Set<number>();
    let previewTo: FaceColor | null = null;

    if (hoverIdx !== null && legalSet.has(hoverIdx) && state.status !== "gameover") {
      const flips = getFlips(state.board, hoverIdx, state.current);
      if (flips.length > 0) {
        previewTarget = hoverIdx;
        previewFlipSet = new Set(flips);
        previewTo = state.current === BLACK ? "black" : "white";
      }
    }

    // ✅ trigger flip animations once per move
    if (state.lastMove !== null && state.lastMove !== lastAnimatedMove) {
      lastAnimatedMove = state.lastMove;
      if (state.lastMove !== null && state.lastMove !== lastAnimatedMove) {
        lastAnimatedMove = state.lastMove;

        // // ✅ 有翻转才播放 flip，且延迟 70ms；同一步只排一次
        // if (state.lastFlipped.length > 0 && state.lastMove !== lastFlipSoundMove) {
        //     lastFlipSoundMove = state.lastMove;
        //     setTimeout(() => {
        //     // 双保险：防止重开局或状态变化导致乱响
        //     if (state.lastMove === lastFlipSoundMove) playFlip();
        //     }, 500);
        // }

        for (const f of state.lastFlipped) {
            const to = state.board[f] === BLACK ? "black" : "white";
            const from = to === "black" ? "white" : "black";
            startFlip(f, from, to);
        }
      }


      // 被翻的棋子：旧色 = 反色，新色 = 当前棋盘上的颜色（已经翻完）
      for (const f of state.lastFlipped) {
        const to = state.board[f] === BLACK ? "black" : "white";
        const from = to === "black" ? "white" : "black";
        startFlip(f, from, to);
      }
    }

    // HUD
    msgEl.textContent =
      state.message || (state.status === "gameover" ? "Click Restart to play again." : "");

    // Board
    for (let i = 0; i < 64; i++) {
      const cellBtn = cells[i];
      const hint = hints[i];
      const ghost = ghosts[i];
      const piece = pieces[i];

      const cell = state.board[i];

      // classes (你原来那些 last / preview-to-xxx 可以继续用)
      cellBtn.classList.toggle("last", state.lastMove === i);
      cellBtn.classList.toggle("preview-target", previewTarget === i);
      cellBtn.classList.toggle("preview-to-black", previewFlipSet.has(i) && previewTo === "black");
      cellBtn.classList.toggle("preview-to-white", previewFlipSet.has(i) && previewTo === "white");

      const isLegalEmpty = cell === 0 && legalSet.has(i) && state.status !== "gameover";
      const isPreviewTarget = previewTarget === i;

      // hint / ghost display
      show(hint, isLegalEmpty && !isPreviewTarget);
      show(ghost, isLegalEmpty && isPreviewTarget);

      if (isLegalEmpty && isPreviewTarget) {
        ghost.classList.toggle("black", state.current === BLACK);
        ghost.classList.toggle("white", state.current === WHITE);
      } else {
        ghost.classList.remove("black", "white");
      }

      // piece display
      if (cell === 0) {
        show(piece, false);
      } else {
        show(piece, true);

        // 如果该格正在翻转，颜色由 startFlip 控制，这里不要覆盖
        if (!flipping.has(i)) {
          const color: FaceColor = cell === BLACK ? "black" : "white";
          setFaceColor(faceFront[i], color);
          setFaceColor(faceBack[i], color);
        }
      }
    }
  }

  render();
}


