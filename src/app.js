import "./styles.css";
import { apiRequest, resetApiSession } from "./api.js";
import { evaluateState } from "../shared/ai.js";
import {
  applyMove,
  countMaterial,
  createInitialState,
  createUndoSnapshot,
  getLegalMoves,
  opponentOf,
  resignGame,
  restoreUndoSnapshot,
  timeoutGame,
} from "../shared/game-engine.js";

const app = document.querySelector("#app");
const aiWorker = new Worker(new URL("./ai-worker.js", import.meta.url), {
  type: "module",
});

const savedSettings = JSON.parse(
  localStorage.getItem("edge-kings.settings") ??
    '{"sound":false,"vibration":true,"reducedMotion":false,"highContrast":false}',
);

const state = {
  user: null,
  view: "loading",
  gameId: null,
  game: null,
  guest: false,
  difficulty: "easy",
  selected: null,
  moves: [],
  undoSnapshot: null,
  computerThinking: false,
  message: "",
  startedAt: null,
  statistics: null,
  history: [],
  replay: null,
  tutorialStep: 0,
  resetToken: null,
  settings: savedSettings,
};

let clockInterval = null;
let aiRequestId = 0;
let timeoutGrace = null;

/** Escapes player-controlled text before inserting it into HTML templates. */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Applies saved visual preferences without requiring a server round trip. */
function applySettings() {
  document.body.classList.toggle("reduce-motion", state.settings.reducedMotion);
  document.body.classList.toggle("high-contrast", state.settings.highContrast);
}

/** Provides optional lightweight sound and haptic feedback after legal moves. */
function playMoveFeedback(capture) {
  if (state.settings.vibration && "vibrate" in navigator) {
    navigator.vibrate(capture ? [35, 30, 55] : 30);
  }
  if (state.settings.sound) {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (AudioContext) {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = capture ? 330 : 220;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.08);
      oscillator.addEventListener("ended", () => context.close());
    }
  }
}

/** Produces the shared header and page frame for all application views. */
function page(content, { compact = false } = {}) {
  return `
    <header class="border-b border-slate-800 bg-slate-950/95">
      <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <button data-action="home" class="text-left" aria-label="Edge Kings home">
          <span class="block text-lg font-black tracking-tight">EDGE KINGS</span>
          <span class="block text-xs text-slate-400">Think ahead. Take the edge.</span>
        </button>
        <div class="flex items-center gap-2">
          <button data-action="settings" class="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">Settings</button>
        ${
          state.user
            ? `<div class="flex items-center gap-2"><button data-action="profile" class="rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800">${escapeHtml(state.user.displayName)}</button>
                <button data-action="logout" class="rounded-lg border border-slate-700 px-3 py-2 text-sm">Log out</button>
              </div>`
            : `<button data-action="login-view" class="rounded-lg border border-slate-700 px-3 py-2 text-sm">Log in</button>`
        }
        </div>
      </div>
    </header>
    <main id="main-content" class="mx-auto ${compact ? "max-w-2xl" : "max-w-5xl"} px-4 py-6">
      ${state.message ? `<div role="status" class="mb-4 rounded-xl border border-blue-500/40 bg-blue-500/10 p-3 text-sm">${escapeHtml(state.message)}</div>` : ""}
      ${content}
    </main>
  `;
}

/** Renders the signed-out landing page with the guest-first primary action. */
function renderLanding() {
  app.innerHTML = page(`
    <section class="grid items-center gap-8 py-8 md:grid-cols-2 md:py-16">
      <div>
        <p class="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-orange-400">Mobile strategy game</p>
        <h1 class="text-4xl font-black leading-tight sm:text-5xl">Capture every piece.<br />Or leave no way out.</h1>
        <p class="mt-5 max-w-xl text-lg text-slate-300">Edge Kings turns familiar draughts into quick, tactical matches with backward captures, branching chains, and fair computer opponents.</p>
        <div class="mt-7 flex flex-wrap gap-3">
          <button data-action="tutorial" class="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-400">Try the tutorial</button>
          <button data-action="register-view" class="rounded-xl border border-slate-600 px-5 py-3 font-bold hover:bg-slate-800">Create profile</button>
        </div>
      </div>
      <div class="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div class="grid grid-cols-2 gap-4">
          <div><p class="text-3xl font-black text-blue-400">8×8</p><p class="text-sm text-slate-400">Classic board</p></div>
          <div><p class="text-3xl font-black text-orange-400">3</p><p class="text-sm text-slate-400">AI difficulties</p></div>
          <div><p class="text-3xl font-black">1</p><p class="text-sm text-slate-400">Helpful undo</p></div>
          <div><p class="text-3xl font-black">5–10m</p><p class="text-sm text-slate-400">Target match</p></div>
        </div>
      </div>
    </section>
  `);
}

/** Renders registration or login while keeping account fields mobile friendly. */
function renderAuth(mode) {
  const registration = mode === "register";
  app.innerHTML = page(
    `
      <section class="mx-auto max-w-md">
        <p class="text-sm font-bold uppercase tracking-widest text-orange-400">${registration ? "New player" : "Welcome back"}</p>
        <h1 class="mt-2 text-3xl font-black">${registration ? "Create your profile" : "Log in"}</h1>
        <form data-form="${mode}" class="mt-6 space-y-4">
          ${
            registration
              ? `<label class="block"><span class="mb-1 block text-sm font-semibold">Display name</span><input name="displayName" required minlength="3" maxlength="24" autocomplete="nickname" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" /></label>`
              : ""
          }
          <label class="block"><span class="mb-1 block text-sm font-semibold">Email</span><input name="email" type="email" required autocomplete="email" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" /></label>
          <label class="block"><span class="mb-1 block text-sm font-semibold">Password</span><input name="password" type="password" required minlength="${registration ? 10 : 1}" autocomplete="${registration ? "new-password" : "current-password"}" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" /></label>
          <button class="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500">${registration ? "Create profile" : "Log in"}</button>
        </form>
        <div class="mt-5 flex justify-between text-sm">
          <button data-action="${registration ? "login-view" : "register-view"}" class="text-blue-400 hover:underline">${registration ? "Already registered?" : "Need a profile?"}</button>
          ${registration ? "" : `<button data-action="forgot-view" class="text-slate-400 hover:underline">Forgot password?</button>`}
        </div>
      </section>
    `,
    { compact: true },
  );
}

/** Renders the password form reached through a time-limited email reset link. */
function renderPasswordReset() {
  app.innerHTML = page(
    `
      <section class="mx-auto max-w-md">
        <p class="text-sm font-bold uppercase tracking-widest text-orange-400">Account recovery</p>
        <h1 class="mt-2 text-3xl font-black">Choose a new password</h1>
        <form data-form="reset-password" class="mt-6 space-y-4">
          <label class="block"><span class="mb-1 block text-sm font-semibold">New password</span><input name="password" type="password" required minlength="10" autocomplete="new-password" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3" /></label>
          <button class="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-500">Update password</button>
        </form>
      </section>
    `,
    { compact: true },
  );
}

/** Presents a short three-step tutorial before the one permitted guest match. */
function renderTutorial() {
  const steps = [
    {
      title: "Move toward the far edge",
      text: "Ordinary pieces move one diagonal square forward. Reach the final row to earn a King that moves both ways.",
    },
    {
      title: "Captures are mandatory",
      text: "Jump an adjacent opponent into the empty square beyond. Pieces can capture forward or backward, and a chain must continue.",
    },
    {
      title: "Win by capture or blockade",
      text: "Take every opposing piece or leave the opponent without a legal move. You receive one undo against the computer.",
    },
  ];
  const step = steps[state.tutorialStep];

  app.innerHTML = page(
    `
      <section class="mx-auto max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <p class="text-sm font-bold text-orange-400">Tutorial ${state.tutorialStep + 1} of ${steps.length}</p>
        <h1 class="mt-3 text-3xl font-black">${step.title}</h1>
        <p class="mt-4 text-lg leading-relaxed text-slate-300">${step.text}</p>
        <div class="mt-8 flex items-center justify-between">
          <button data-action="tutorial-back" ${state.tutorialStep === 0 ? "disabled" : ""} class="rounded-xl px-4 py-3 text-slate-300 disabled:opacity-30">Back</button>
          <button data-action="${state.tutorialStep === steps.length - 1 ? "guest-game" : "tutorial-next"}" class="rounded-xl bg-orange-500 px-5 py-3 font-bold">${state.tutorialStep === steps.length - 1 ? "Play guest match" : "Next"}</button>
        </div>
      </section>
    `,
    { compact: true },
  );
}

/** Renders the signed-in dashboard, prioritizing an active match when present. */
function renderDashboard() {
  const stats = state.statistics ?? {
    games: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
  };
  app.innerHTML = page(`
    <section>
      <p class="text-sm font-bold uppercase tracking-widest text-blue-400">Player dashboard</p>
      <h1 class="mt-2 text-3xl font-black">Ready, ${escapeHtml(state.user.displayName)}?</h1>
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <button data-action="${state.game ? "resume-game" : "setup"}" class="rounded-2xl bg-blue-600 p-6 text-left hover:bg-blue-500">
          <span class="block text-2xl font-black">${state.game ? "Resume game" : "New game"}</span>
          <span class="mt-1 block text-blue-100">${state.game ? "Continue your active match" : "Challenge the computer"}</span>
        </button>
        <button data-action="tutorial" class="rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left hover:bg-slate-800">
          <span class="block text-xl font-bold">Rules tutorial</span>
          <span class="mt-1 block text-slate-400">Refresh the essentials</span>
        </button>
      </div>
      <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        ${[
          ["Games", stats.games],
          ["Wins", stats.wins],
          ["Losses", stats.losses],
          ["Draws", stats.draws],
          ["Win rate", `${stats.winRate}%`],
        ]
          .map(
            ([label, value]) =>
              `<div class="rounded-xl bg-slate-900 p-4"><strong class="block text-2xl">${value}</strong><span class="text-xs text-slate-400">${label}</span></div>`,
          )
          .join("")}
      </div>
      <div class="mt-6 flex gap-3">
        <button data-action="history" class="rounded-xl border border-slate-700 px-4 py-3 font-semibold">Recent games</button>
        <a href="/docs/game-rules.md" class="rounded-xl px-4 py-3 font-semibold text-slate-300">Full rules</a>
      </div>
    </section>
  `);
}

/** Renders the compact match setup while remembering browser-level choices. */
function renderSetup() {
  const saved = JSON.parse(localStorage.getItem("edge-kings.setup") ?? "{}");
  app.innerHTML = page(
    `
      <section class="mx-auto max-w-lg">
        <p class="text-sm font-bold uppercase tracking-widest text-orange-400">Computer match</p>
        <h1 class="mt-2 text-3xl font-black">New game</h1>
        <form data-form="game-setup" class="mt-6 space-y-5">
          <label class="block"><span class="mb-2 block font-semibold">Difficulty</span>
            <select name="difficulty" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              ${["easy", "medium", "hard"].map((value) => `<option value="${value}" ${saved.difficulty === value ? "selected" : ""}>${value[0].toUpperCase() + value.slice(1)}</option>`).join("")}
            </select>
          </label>
          <label class="block"><span class="mb-2 block font-semibold">Your side</span>
            <select name="humanPlayer" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <option value="random">Random</option><option value="blue">Blue ●</option><option value="orange">Orange ◆</option>
            </select>
          </label>
          <label class="block"><span class="mb-2 block font-semibold">Your clock</span>
            <select name="clockSeconds" class="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
              <option value="">Untimed</option><option value="180">3 minutes</option><option value="300">5 minutes</option><option value="600">10 minutes</option>
            </select>
          </label>
          <div class="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">Default accessible colours: <span class="font-bold text-blue-400">Blue ●</span> and <span class="font-bold text-orange-400">Orange ◆</span>.</div>
          <button class="w-full rounded-xl bg-orange-500 px-5 py-3 font-bold hover:bg-orange-400">Start game</button>
        </form>
      </section>
    `,
    { compact: true },
  );
}

/** Formats the optional human match clock for the game header. */
function formatClock(seconds) {
  if (seconds === null || seconds === undefined) return "Untimed";
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/** Renders one board state and optionally enables legal move interaction. */
function boardMarkup(gameState, interactive = true) {
  const legalMoves = interactive ? getLegalMoves(gameState) : [];
  const legalDestinations = new Set(
    legalMoves
      .filter((move) => move.from === state.selected)
      .map((move) => move.to),
  );
  const movable = new Set(legalMoves.map((move) => move.from));
  const indexes = [...Array(64).keys()];

  // Rotate indexes so the human side always advances toward the screen top.
  if (gameState.humanPlayer === "orange") indexes.reverse();

  return `
    <div class="game-board mx-auto" role="grid" aria-label="Edge Kings board">
      ${indexes
        .map((index) => {
          const row = Math.floor(index / 8);
          const column = index % 8;
          const dark = (row + column) % 2 === 1;
          const piece = gameState.board[index];
          const selected = state.selected === index;
          const legal = legalDestinations.has(index);
          const canMove = movable.has(index);
          const classes = [
            "board-square",
            dark ? "board-square--dark" : "board-square--light",
            selected ? "board-square--selected" : "",
            legal ? "board-square--legal" : "",
            canMove ? "board-square--movable" : "",
          ].join(" ");
          const label = piece
            ? `${piece.player} ${piece.king ? "King" : "piece"} on row ${row + 1}, column ${column + 1}`
            : `Empty ${dark ? "playable" : "light"} square, row ${row + 1}, column ${column + 1}`;

          return `<button class="${classes}" data-square="${index}" ${!interactive || (!piece && !legal) ? "" : ""} aria-label="${label}" role="gridcell">
            ${
              piece
                ? `<span draggable="${interactive}" data-piece="${index}" class="piece piece--${piece.player}" aria-hidden="true">${piece.king ? "♛" : piece.player === "blue" ? "●" : "◆"}</span>`
                : ""
            }
          </button>`;
        })
        .join("")}
    </div>
  `;
}

/** Renders the active match, controls, material counts, and terminal result. */
function renderGame() {
  const gameState = state.game;
  const material = countMaterial(gameState);
  const humanTurn =
    gameState.status === "active" &&
    gameState.currentPlayer === gameState.humanPlayer;
  const result =
    gameState.status === "completed"
      ? gameState.winner === null
        ? "Draw"
        : gameState.winner === gameState.humanPlayer
          ? "You win"
          : "Computer wins"
      : null;

  app.innerHTML = page(`
    <section>
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-sm font-bold uppercase tracking-widest text-orange-400">${escapeHtml(state.difficulty)} computer</p>
          <h1 class="text-2xl font-black">${result ?? (state.computerThinking ? "Computer is thinking…" : humanTurn ? "Your move" : "Computer turn")}</h1>
          ${result ? `<p class="text-sm text-slate-400">Reason: ${escapeHtml(gameState.resultReason)}</p>` : ""}
        </div>
        <div class="rounded-xl bg-slate-900 px-4 py-2 text-right">
          <span class="block text-xs text-slate-400">Your clock</span>
          <strong class="font-mono text-xl">${formatClock(gameState.clockRemaining)}</strong>
        </div>
      </div>
      <div class="mb-3 flex justify-center gap-6 text-sm">
        <span class="text-blue-300">Blue ●: <strong>${material.blue}</strong></span>
        <span class="text-orange-300">Orange ◆: <strong>${material.orange}</strong></span>
      </div>
      ${boardMarkup(gameState, humanTurn && !state.computerThinking)}
      <div class="mx-auto mt-5 flex max-w-xl flex-wrap justify-center gap-3">
        ${
          gameState.status === "active"
            ? `
              <button data-action="undo" ${gameState.undoUsed || !state.undoSnapshot ? "disabled" : ""} class="rounded-xl border border-slate-700 px-4 py-3 font-semibold disabled:opacity-30">Undo once</button>
              <button data-action="offer-draw" class="rounded-xl border border-slate-700 px-4 py-3 font-semibold">Offer draw</button>
              <button data-action="resign" class="rounded-xl px-4 py-3 font-semibold text-red-300">Resign</button>
            `
            : `
              <button data-action="rematch" class="rounded-xl bg-orange-500 px-5 py-3 font-bold">Rematch</button>
              <button data-action="finish-game" class="rounded-xl border border-slate-700 px-5 py-3 font-bold">${state.guest ? "Create profile" : "Dashboard"}</button>
            `
        }
      </div>
    </section>
  `);
}

/** Renders profile statistics and account safety actions. */
function renderProfile() {
  const stats = state.statistics ?? {};
  app.innerHTML = page(
    `
      <section>
        <h1 class="text-3xl font-black">${escapeHtml(state.user.displayName)}</h1>
        <p class="mt-1 text-slate-400">${escapeHtml(state.user.email)}</p>
        <p class="mt-1 text-sm ${state.user.emailVerifiedAt ? "text-green-400" : "text-amber-400"}">${state.user.emailVerifiedAt ? "Email verified" : "Email verification optional"}</p>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="rounded-xl bg-slate-900 p-4"><strong class="text-2xl">${stats.games ?? 0}</strong><span class="block text-sm text-slate-400">Games</span></div>
          <div class="rounded-xl bg-slate-900 p-4"><strong class="text-2xl">${stats.winRate ?? 0}%</strong><span class="block text-sm text-slate-400">Win rate</span></div>
        </div>
        <div class="mt-6 flex flex-wrap gap-3">
          ${state.user.emailVerifiedAt ? "" : `<button data-action="send-verification" class="rounded-xl border border-slate-700 px-4 py-3">Send verification</button>`}
          <button data-action="history" class="rounded-xl border border-slate-700 px-4 py-3">Recent games</button>
          <button data-action="delete-account" class="rounded-xl px-4 py-3 text-red-300">Delete account</button>
        </div>
      </section>
    `,
    { compact: true },
  );
}

/** Renders local accessibility and feedback preferences for any player. */
function renderSettings() {
  const checked = (key) => (state.settings[key] ? "checked" : "");
  app.innerHTML = page(
    `
      <section class="mx-auto max-w-md">
        <p class="text-sm font-bold uppercase tracking-widest text-blue-400">Preferences</p>
        <h1 class="mt-2 text-3xl font-black">Game settings</h1>
        <form data-form="settings" class="mt-6 space-y-3">
          ${[
            [
              "sound",
              "Move sounds",
              "Play short audio feedback for moves and captures.",
            ],
            [
              "vibration",
              "Vibration",
              "Use brief haptic feedback on supported mobile devices.",
            ],
            [
              "reducedMotion",
              "Reduced motion",
              "Remove non-essential transitions and animation.",
            ],
            [
              "highContrast",
              "High contrast board",
              "Increase board and piece contrast.",
            ],
          ]
            .map(
              ([key, label, description]) => `
                <label class="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <input name="${key}" type="checkbox" ${checked(key)} class="mt-1 size-5 accent-blue-500" />
                  <span><strong class="block">${label}</strong><span class="text-sm text-slate-400">${description}</span></span>
                </label>`,
            )
            .join("")}
          <button class="mt-3 w-full rounded-xl bg-blue-600 px-5 py-3 font-bold">Save settings</button>
        </form>
      </section>
    `,
    { compact: true },
  );
}

/** Renders recent completed matches and exposes their stored move replays. */
function renderHistory() {
  app.innerHTML = page(`
    <section>
      <h1 class="text-3xl font-black">Recent games</h1>
      <div class="mt-6 space-y-3">
        ${
          state.history.length === 0
            ? `<p class="rounded-xl bg-slate-900 p-5 text-slate-400">Complete a registered match to build your history.</p>`
            : state.history
                .map(
                  (game, index) => `
                    <article class="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
                      <div><strong class="capitalize">${escapeHtml(game.result ?? "completed")}</strong><p class="text-sm text-slate-400">${escapeHtml(game.difficulty)} · ${escapeHtml(game.resultReason ?? "")} · ${game.moves.length} actions</p></div>
                      <button data-replay="${index}" class="rounded-lg border border-slate-700 px-3 py-2 text-sm">Replay</button>
                    </article>`,
                )
                .join("")
        }
      </div>
    </section>
  `);
}

/** Renders a selected historic state with simple previous and next controls. */
function renderReplay() {
  const { game, index } = state.replay;
  const replayState =
    index < 0
      ? createInitialState({
          firstPlayer: game.moves[0]?.player ?? "blue",
          humanPlayer: game.humanPlayer,
          clockSeconds: game.clockSeconds,
        })
      : (game.moves[index]?.state ?? game.state);

  app.innerHTML = page(`
    <section>
      <p class="text-sm font-bold uppercase tracking-widest text-blue-400">Replay</p>
      <h1 class="mb-5 text-2xl font-black">Move ${index + 1} of ${game.moves.length}</h1>
      ${boardMarkup(replayState, false)}
      <div class="mt-5 flex justify-center gap-3">
        <button data-action="replay-previous" ${index < 0 ? "disabled" : ""} class="rounded-xl border border-slate-700 px-4 py-3 disabled:opacity-30">Previous</button>
        <button data-action="replay-next" ${index >= game.moves.length - 1 ? "disabled" : ""} class="rounded-xl border border-slate-700 px-4 py-3 disabled:opacity-30">Next</button>
        <button data-action="history" class="rounded-xl px-4 py-3">Close</button>
      </div>
    </section>
  `);
}

/** Chooses the correct view after any state transition. */
function render() {
  if (state.view === "loading") {
    app.innerHTML = page(
      `<p class="py-20 text-center text-slate-400">Loading Edge Kings…</p>`,
    );
  } else if (state.view === "landing") renderLanding();
  else if (state.view === "login") renderAuth("login");
  else if (state.view === "register") renderAuth("register");
  else if (state.view === "reset-password") renderPasswordReset();
  else if (state.view === "tutorial") renderTutorial();
  else if (state.view === "dashboard") renderDashboard();
  else if (state.view === "setup") renderSetup();
  else if (state.view === "game") renderGame();
  else if (state.view === "profile") renderProfile();
  else if (state.view === "settings") renderSettings();
  else if (state.view === "history") renderHistory();
  else if (state.view === "replay") renderReplay();
}

/** Loads account, active game, and profile summaries on application startup. */
async function bootstrap() {
  try {
    const parameters = new URLSearchParams(window.location.search);
    const linkView = parameters.get("view");
    const linkToken = parameters.get("token");

    // Email links perform their one-time action before normal session loading.
    if (linkView === "reset-password" && linkToken) {
      state.resetToken = linkToken;
      state.view = "reset-password";
      render();
      return;
    }
    if (linkView === "verify-email" && linkToken) {
      const result = await apiRequest("/auth/verify", {
        method: "POST",
        body: { token: linkToken },
      });
      state.message = result.message;
      window.history.replaceState({}, "", "/");
    }

    const { user } = await apiRequest("/auth/me");
    state.user = user;
    if (user) {
      const [{ game }, { statistics }] = await Promise.all([
        apiRequest("/games/active"),
        apiRequest("/games/statistics"),
      ]);
      if (game) {
        state.gameId = game.id;
        state.game = game.state;
        state.moves = game.moves;
        state.difficulty = game.difficulty;
        state.startedAt = new Date(game.updatedAt ?? Date.now()).getTime();
      }
      state.statistics = statistics;
      state.view = "dashboard";
    } else {
      state.view = "landing";
    }
  } catch (error) {
    state.message = error.message;
    state.view = "landing";
  }
  render();
}

/** Starts the once-per-guest Easy game or a configured registered game. */
async function startGame(configuration, guest = false) {
  state.message = "";
  state.guest = guest;
  state.difficulty = configuration.difficulty;
  state.moves = [];
  state.undoSnapshot = null;
  state.selected = null;
  state.startedAt = Date.now();

  if (guest) {
    state.gameId = null;
    state.game = createInitialState({
      firstPlayer: "blue",
      humanPlayer: "blue",
      clockSeconds: null,
    });
  } else {
    const { game } = await apiRequest("/games", {
      method: "POST",
      body: configuration,
    });
    state.gameId = game.id;
    state.game = game.state;
  }

  state.view = "game";
  startClock();
  render();
  scheduleComputerIfNeeded();
}

/** Persists an authenticated active game after each stable state transition. */
async function saveActiveGame() {
  if (!state.user || !state.gameId || state.game.status !== "active") return;
  await apiRequest(`/games/${state.gameId}`, {
    method: "PUT",
    body: { state: state.game, moves: state.moves },
  });
}

/** Records terminal registered matches and refreshes profile statistics. */
async function completeGameIfNeeded() {
  if (state.game.status !== "completed" || !state.user || !state.gameId) return;

  const result =
    state.game.winner === null
      ? "draw"
      : state.game.winner === state.game.humanPlayer
        ? "win"
        : "loss";
  await apiRequest(`/games/${state.gameId}/complete`, {
    method: "POST",
    body: {
      state: state.game,
      moves: state.moves,
      result,
      resultReason: state.game.resultReason,
      durationSeconds: Math.max(
        0,
        Math.round((Date.now() - state.startedAt) / 1000),
      ),
    },
  });
  const { statistics } = await apiRequest("/games/statistics");
  state.statistics = statistics;
}

/** Applies a move, records replay state, and handles completion or AI turns. */
async function performMove(move, actor) {
  const before = structuredClone(state.game);
  const next = applyMove(state.game, move);
  state.game = next;
  state.selected = next.forcedPieceId
    ? next.board.findIndex((piece) => piece?.id === next.forcedPieceId)
    : null;
  state.moves.push({
    player: actor,
    from: move.from,
    to: move.to,
    capture: Boolean(move.capture),
    state: structuredClone(next),
  });
  playMoveFeedback(Boolean(move.capture));

  if (next.status === "completed") {
    stopClock();
    await completeGameIfNeeded();
  } else if (before.currentPlayer !== next.currentPlayer) {
    await saveActiveGame();
  }

  render();
  scheduleComputerIfNeeded();
}

/** Requests AI moves and repeats automatically while a capture chain continues. */
function scheduleComputerIfNeeded() {
  if (
    !state.game ||
    state.game.status !== "active" ||
    state.game.currentPlayer === state.game.humanPlayer ||
    state.computerThinking
  ) {
    return;
  }

  state.computerThinking = true;
  render();
  const requestId = ++aiRequestId;
  window.setTimeout(() => {
    aiWorker.postMessage({
      requestId,
      state: state.game,
      difficulty: state.difficulty,
      aiPlayer: opponentOf(state.game.humanPlayer),
    });
  }, 350);
}

/** Resolves worker results while ignoring stale requests after undo or navigation. */
aiWorker.addEventListener("message", async (event) => {
  if (event.data.requestId !== aiRequestId) return;
  state.computerThinking = false;
  if (event.data.error) {
    state.message = event.data.error;
    render();
    return;
  }
  if (event.data.move) {
    await performMove(event.data.move, state.game.currentPlayer);
  }
});

/** Runs the human-only clock and applies the selected-piece grace rule. */
function startClock() {
  stopClock();
  if (state.game?.clockRemaining === null) return;

  clockInterval = window.setInterval(async () => {
    if (
      state.view !== "game" ||
      state.game?.status !== "active" ||
      state.game.currentPlayer !== state.game.humanPlayer
    ) {
      return;
    }

    state.game.clockRemaining = Math.max(0, state.game.clockRemaining - 1);
    if (state.game.clockRemaining === 0) {
      stopClock();
      const selectedHasMove = getLegalMoves(state.game).some(
        (move) => move.from === state.selected,
      );

      if (selectedHasMove) {
        timeoutGrace = window.setTimeout(async () => {
          if (
            state.game.status === "active" &&
            state.game.currentPlayer === state.game.humanPlayer
          ) {
            state.game = timeoutGame(state.game);
            await completeGameIfNeeded();
            render();
          }
        }, 2_000);
      } else {
        state.game = timeoutGame(state.game);
        await completeGameIfNeeded();
      }
    }
    render();
  }, 1_000);
}

/** Stops active clock and grace timers during completion or navigation. */
function stopClock() {
  if (clockInterval) window.clearInterval(clockInterval);
  if (timeoutGrace) window.clearTimeout(timeoutGrace);
  clockInterval = null;
  timeoutGrace = null;
}

/** Handles board selection and legal destinations for both tap and drag input. */
async function handleSquare(index) {
  if (
    state.game.currentPlayer !== state.game.humanPlayer ||
    state.game.status !== "active" ||
    state.computerThinking
  ) {
    return;
  }

  const legalMoves = getLegalMoves(state.game);
  const destination = legalMoves.find(
    (move) => move.from === state.selected && move.to === index,
  );
  if (destination) {
    if (!state.game.forcedPieceId && !state.game.undoUsed) {
      state.undoSnapshot = createUndoSnapshot(state.game, state.moves);
    }
    if (timeoutGrace) {
      window.clearTimeout(timeoutGrace);
      timeoutGrace = null;
    }
    await performMove(destination, state.game.humanPlayer);
    return;
  }

  if (legalMoves.some((move) => move.from === index)) {
    state.selected = index;
  } else if (!state.game.forcedPieceId) {
    state.selected = null;
  }
  render();
}

/** Loads history before rendering to avoid empty intermediate states. */
async function openHistory() {
  const { games } = await apiRequest("/games/history");
  state.history = games;
  state.view = "history";
  render();
}

/** Handles navigation and match actions through one delegated click listener. */
app.addEventListener("click", async (event) => {
  const square = event.target.closest("[data-square]");
  if (square && state.view === "game") {
    await handleSquare(Number(square.dataset.square));
    return;
  }

  const replayButton = event.target.closest("[data-replay]");
  if (replayButton) {
    state.replay = {
      game: state.history[Number(replayButton.dataset.replay)],
      index: -1,
    };
    state.view = "replay";
    render();
    return;
  }

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  state.message = "";

  try {
    if (action === "home") {
      state.view = state.user ? "dashboard" : "landing";
    } else if (action === "login-view") state.view = "login";
    else if (action === "register-view") state.view = "register";
    else if (action === "forgot-view") {
      const email = window.prompt("Enter the email address for your profile:");
      if (email) {
        const result = await apiRequest("/auth/forgot-password", {
          method: "POST",
          body: { email },
        });
        state.message = result.message;
      }
    } else if (action === "tutorial") {
      state.tutorialStep = 0;
      state.view = "tutorial";
    } else if (action === "tutorial-next") {
      state.tutorialStep += 1;
    } else if (action === "tutorial-back") {
      state.tutorialStep = Math.max(0, state.tutorialStep - 1);
    } else if (action === "guest-game") {
      await startGame(
        {
          difficulty: "easy",
          humanPlayer: "blue",
          clockSeconds: null,
        },
        true,
      );
      return;
    } else if (action === "setup") state.view = "setup";
    else if (action === "resume-game") {
      state.view = "game";
      startClock();
      scheduleComputerIfNeeded();
    } else if (action === "profile") state.view = "profile";
    else if (action === "settings") state.view = "settings";
    else if (action === "history") {
      await openHistory();
      return;
    } else if (action === "undo" && state.undoSnapshot) {
      aiRequestId += 1;
      state.computerThinking = false;
      const restored = restoreUndoSnapshot(state.undoSnapshot);
      state.game = restored.state;
      state.moves = restored.moves;
      state.undoSnapshot = null;
      await saveActiveGame();
      startClock();
    } else if (action === "resign") {
      if (window.confirm("Resign this match and record a loss?")) {
        state.game = resignGame(state.game, state.game.humanPlayer);
        stopClock();
        await completeGameIfNeeded();
      }
    } else if (action === "offer-draw") {
      const computer = opponentOf(state.game.humanPlayer);
      if (evaluateState(state.game, computer) <= 0) {
        state.game = {
          ...state.game,
          status: "completed",
          winner: null,
          resultReason: "agreed-draw",
        };
        stopClock();
        await completeGameIfNeeded();
      } else {
        state.message = "The computer declined the draw offer.";
      }
    } else if (action === "rematch") {
      if (state.guest) {
        state.view = "register";
      } else {
        const rematchConfiguration = {
          difficulty: state.difficulty,
          humanPlayer: state.game.humanPlayer,
          clockSeconds: state.game.initialClockSeconds,
          firstPlayer: opponentOf(state.game.openingPlayer),
        };
        state.gameId = null;
        await startGame(rematchConfiguration);
        return;
      }
    } else if (action === "finish-game") {
      state.gameId = null;
      state.game = null;
      state.view = state.guest ? "register" : "dashboard";
    } else if (action === "send-verification") {
      const result = await apiRequest("/auth/verification", { method: "POST" });
      state.message = `${result.message}${result.previewUrl ? ` Local link: ${result.previewUrl}` : ""}`;
    } else if (action === "delete-account") {
      if (window.confirm("Request account deletion? You will be logged out.")) {
        await apiRequest("/auth/account", { method: "DELETE" });
        resetApiSession();
        state.user = null;
        state.view = "landing";
      }
    } else if (action === "logout") {
      await apiRequest("/auth/logout", { method: "POST" });
      stopClock();
      resetApiSession();
      state.user = null;
      state.game = null;
      state.view = "landing";
    } else if (action === "replay-previous") {
      state.replay.index = Math.max(-1, state.replay.index - 1);
    } else if (action === "replay-next") {
      state.replay.index = Math.min(
        state.replay.game.moves.length - 1,
        state.replay.index + 1,
      );
    }
  } catch (error) {
    state.message = error.message;
  }
  render();
});

/** Supports drag-and-drop by translating a drop target into the same move flow. */
app.addEventListener("dragstart", (event) => {
  const piece = event.target.closest("[data-piece]");
  if (piece) event.dataTransfer.setData("text/plain", piece.dataset.piece);
});
app.addEventListener("dragover", (event) => {
  if (event.target.closest("[data-square]")) event.preventDefault();
});
app.addEventListener("drop", async (event) => {
  const square = event.target.closest("[data-square]");
  if (!square) return;
  event.preventDefault();
  state.selected = Number(event.dataTransfer.getData("text/plain"));
  await handleSquare(Number(square.dataset.square));
});

/** Handles account and new-game forms without assigning global handlers. */
app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const formType = form.dataset.form;
  const values = Object.fromEntries(new FormData(form));
  state.message = "";

  try {
    if (formType === "register" || formType === "login") {
      const endpoint =
        formType === "register" ? "/auth/register" : "/auth/login";
      const { user, previewUrl } = await apiRequest(endpoint, {
        method: "POST",
        body: values,
      });
      state.user = user;
      state.statistics = {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
      };
      state.message = previewUrl
        ? `Profile created. Local verification link: ${previewUrl}`
        : "Welcome to Edge Kings.";
      state.view = "dashboard";
    } else if (formType === "reset-password") {
      const result = await apiRequest("/auth/reset-password", {
        method: "POST",
        body: {
          token: state.resetToken,
          password: values.password,
        },
      });
      state.resetToken = null;
      state.message = result.message;
      window.history.replaceState({}, "", "/");
      state.view = "login";
    } else if (formType === "settings") {
      state.settings = {
        sound: values.sound === "on",
        vibration: values.vibration === "on",
        reducedMotion: values.reducedMotion === "on",
        highContrast: values.highContrast === "on",
      };
      localStorage.setItem(
        "edge-kings.settings",
        JSON.stringify(state.settings),
      );
      applySettings();
      state.message = "Settings saved.";
      state.view = state.user ? "dashboard" : "landing";
    } else if (formType === "game-setup") {
      const humanPlayer =
        values.humanPlayer === "random"
          ? Math.random() < 0.5
            ? "blue"
            : "orange"
          : values.humanPlayer;
      const configuration = {
        difficulty: values.difficulty,
        humanPlayer,
        clockSeconds: values.clockSeconds ? Number(values.clockSeconds) : null,
      };
      localStorage.setItem("edge-kings.setup", JSON.stringify(configuration));
      await startGame(configuration);
      return;
    }
  } catch (error) {
    state.message = error.message;
  }
  render();
});

applySettings();
bootstrap();
