/* =========================================================================
   Fortune Tiger — DEMO clone
   Play-money only. No real payments, no deposits/withdrawals.
   Pure HTML/CSS/JS, no build step, no external assets.
   ========================================================================= */

(() => {
  "use strict";

  /* ---------------- Symbols (hand-drawn inline SVGs, no external assets) ---------------- */
  const SVG_INGOT = `<svg viewBox="0 0 100 100"><polygon points="22,72 78,72 64,34 36,34" fill="#f6d37a" stroke="#a9780b" stroke-width="3"/><polygon points="30,70 70,70 60,46 40,46" fill="#fff3cf" opacity="0.55"/></svg>`;
  const SVG_COIN = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#5fcf7a" stroke="#1f6d4a" stroke-width="5"/><rect x="38" y="38" width="24" height="24" fill="#1f6d4a"/><rect x="42" y="42" width="16" height="16" fill="#eafff0"/></svg>`;
  const SVG_ENVELOPE = `<svg viewBox="0 0 100 100"><rect x="18" y="22" width="64" height="56" rx="6" fill="#c2232a" stroke="#f4c95d" stroke-width="3"/><circle cx="50" cy="50" r="16" fill="#f4c95d"/><text x="50" y="57" font-size="18" text-anchor="middle" fill="#8a1116" font-family="serif">福</text></svg>`;
  const SVG_FIRECRACKER = `<svg viewBox="0 0 100 100"><rect x="28" y="20" width="18" height="60" rx="6" fill="#d2232a" stroke="#f4c95d" stroke-width="2"/><rect x="54" y="20" width="18" height="60" rx="6" fill="#d2232a" stroke="#f4c95d" stroke-width="2"/><rect x="26" y="34" width="22" height="6" fill="#f4c95d"/><rect x="52" y="34" width="22" height="6" fill="#f4c95d"/><rect x="26" y="58" width="22" height="6" fill="#f4c95d"/><rect x="52" y="58" width="22" height="6" fill="#f4c95d"/><path d="M37 20 Q50 6 63 20" stroke="#f4c95d" stroke-width="3" fill="none"/></svg>`;

  // pay = multiplier of the *per-line bet* for 2-in-a-row / 3-in-a-row
  const SYMBOLS = {
    ingot:       { icon: SVG_INGOT,      label: "Lingote",    pay: { 2: 0.4, 3: 1.2 }, weight: 38 },
    coin:        { icon: SVG_COIN,       label: "Moeda Jade", pay: { 2: 0.6, 3: 2.0 }, weight: 28 },
    envelope:    { icon: SVG_ENVELOPE,   label: "Envelope",   pay: { 2: 1.0, 3: 4.0 }, weight: 20 },
    firecracker: { icon: SVG_FIRECRACKER, label: "Fogos",     pay: { 2: 2.0, 3: 8.0 }, weight: 12 },
  };
  const SYMBOL_IDS = Object.keys(SYMBOLS);
  const TOTAL_WEIGHT = SYMBOL_IDS.reduce((s, id) => s + SYMBOLS[id].weight, 0);

  const WILD_PAY = { 2: 3.0, 3: 15.0 };
  const WILD_MULTIPLIERS = [2, 2, 2, 3, 3, 5, 10]; // weighted pool
  const NORMAL_WILD_CHANCE = 0.14;   // chance a given column expands to WILD
  const BONUS_WILD_CHANCE  = 0.34;   // during free spins

  const PAYLINES = [
    { name: "topo",    cells: [[0,0],[1,0],[2,0]] },
    { name: "meio",    cells: [[0,1],[1,1],[2,1]] },
    { name: "base",    cells: [[0,2],[1,2],[2,2]] },
    { name: "pico",    cells: [[0,0],[1,1],[2,0]] },
    { name: "vale",    cells: [[0,2],[1,1],[2,2]] },
  ];

  const BET_LEVELS = [0.20, 0.40, 1.00, 2.00, 4.00, 10.00, 20.00, 50.00, 100.00, 200.00];

  const FLAVOR_MESSAGES = [
    "Boa sorte!",
    "O Tigre está observando…",
    "Gire para a fortuna!",
    "Cidade Tigre da Sorte!",
  ];

  /* ---------------- State ---------------- */
  const state = {
    balance: 0,
    startingBalance: 2000,
    betIndex: 4,              // index into BET_LEVELS -> 4.00
    isSpinning: false,
    turbo: false,
    soundOn: true,
    autoSpinsLeft: 0,
    meter: 0,
    meterGoal: 3,
    inFreeSpins: false,
    freeSpinsLeft: 0,
    freeSpinsTotal: 0,
    freeSpinsWin: 0,
    grid: [], // 3 columns x {wild,mult,symbols[3]}
  };

  const bet = () => BET_LEVELS[state.betIndex];
  const fmt = (v) => "R$" + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ---------------- DOM refs ---------------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    clock: $("clock"),
    reels: $("reels"),
    winOverlay: $("winOverlay"),
    messageText: $("messageText"),
    meterFill: $("meterFill"),
    meterCount: $("meterCount"),
    menuBtn: $("menuBtn"),
    balanceValue: $("balanceValue"),
    balanceValue2: $("balanceValue2"),
    betValue: $("betValue"),
    betValue2: $("betValue2"),
    soundBtn: $("soundBtn"),
    turboBtn: $("turboBtn"),
    minusBtn: $("minusBtn"),
    plusBtn: $("plusBtn"),
    spinBtn: $("spinBtn"),
    autoBtn: $("autoBtn"),
    openBetModal: $("openBetModal"),
    betModalBackdrop: $("betModalBackdrop"),
    closeBetModal: $("closeBetModal"),
    betTableBody: $("betTableBody"),
    maxBetBtn: $("maxBetBtn"),
    confirmBetBtn: $("confirmBetBtn"),
    fsBanner: $("fsBanner"),
    fsTitle: $("fsTitle"),
    fsSub: $("fsSub"),
    bigwin: $("bigwin"),
    bigwinLabel: $("bigwinLabel"),
    bigwinAmount: $("bigwinAmount"),
    holdBanner: $("holdBanner"),
  };

  /* ---------------- Sound (synthesized, no assets) ---------------- */
  let audioCtx = null;
  function ctx() {
    if (!state.soundOn) return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function beep({ freq = 440, dur = 0.12, type = "sine", gain = 0.06, delay = 0 }) {
    const c = ctx();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  const sfx = {
    tick: () => beep({ freq: 900, dur: 0.04, type: "square", gain: 0.03 }),
    reelStop: () => beep({ freq: 220, dur: 0.08, type: "triangle", gain: 0.08 }),
    win: () => { [660, 880, 1100].forEach((f, i) => beep({ freq: f, dur: 0.18, delay: i * 0.08, gain: 0.07 })); },
    bigwin: () => { [440, 660, 880, 1100, 1320].forEach((f, i) => beep({ freq: f, dur: 0.25, delay: i * 0.1, gain: 0.08 })); },
    wild: () => beep({ freq: 180, dur: 0.3, type: "sawtooth", gain: 0.07 }),
    bonus: () => { [330, 440, 550, 660, 880].forEach((f, i) => beep({ freq: f, dur: 0.3, delay: i * 0.12, gain: 0.08 })); },
    coin: () => beep({ freq: 1500, dur: 0.06, type: "square", gain: 0.03 }),
  };

  /* ---------------- Build reel DOM ---------------- */
  function buildReelDom() {
    el.reels.innerHTML = "";
    for (let c = 0; c < 3; c++) {
      const col = document.createElement("div");
      col.className = "reel-col";
      col.dataset.col = c;
      for (let r = 0; r < 3; r++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = r;
        col.appendChild(cell);
      }
      el.reels.appendChild(col);
    }
  }

  function randomNormalSymbol() {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const id of SYMBOL_IDS) {
      roll -= SYMBOLS[id].weight;
      if (roll <= 0) return id;
    }
    return SYMBOL_IDS[0];
  }

  function pickWildMultiplier() {
    return WILD_MULTIPLIERS[Math.floor(Math.random() * WILD_MULTIPLIERS.length)];
  }

  function generateGrid() {
    const wildChance = state.inFreeSpins ? BONUS_WILD_CHANCE : NORMAL_WILD_CHANCE;
    return Array.from({ length: 3 }, () => {
      if (Math.random() < wildChance) {
        return { wild: true, mult: pickWildMultiplier(), symbols: ["wild", "wild", "wild"] };
      }
      return { wild: false, symbols: [randomNormalSymbol(), randomNormalSymbol(), randomNormalSymbol()] };
    });
  }

  function cellContent(symId) {
    if (symId === "wild") {
      return `<span class="wild-icon">🐯</span><span class="wild-label">WILD</span>`;
    }
    return `<span>${SYMBOLS[symId].icon}</span>`;
  }

  function renderGrid(grid, { winningCells = new Set() } = {}) {
    const cols = el.reels.children;
    for (let c = 0; c < 3; c++) {
      const colData = grid[c];
      const colEl = cols[c];
      colEl.classList.remove("spinning");
      for (let r = 0; r < 3; r++) {
        const cellEl = colEl.children[r];
        const symId = colData.symbols[r];
        cellEl.className = "cell" + (symId === "wild" ? " wild" : "");
        if (colData.wild) {
          cellEl.classList.add("mult-badge");
          cellEl.dataset.mult = "x" + colData.mult;
        } else {
          delete cellEl.dataset.mult;
        }
        if (winningCells.has(c + "," + r)) cellEl.classList.add("win-glow");
        cellEl.innerHTML = cellContent(symId);
      }
    }
  }

  function setSpinningVisual(spinning) {
    const cols = el.reels.children;
    for (const colEl of cols) {
      colEl.classList.toggle("spinning", spinning);
    }
  }

  /* ---------------- Win evaluation ---------------- */
  function evaluateWin(grid) {
    const lineBet = bet() / PAYLINES.length;
    let totalBase = 0;
    const winningCells = new Set();
    const winningLines = [];

    for (const line of PAYLINES) {
      const syms = line.cells.map(([c, r]) => grid[c].symbols[r]);
      // determine the matching run starting from reel 0, wild matches anything
      const base = syms.find((s) => s !== "wild");
      let matchSym = base || "wild";
      let count = 0;
      for (const s of syms) {
        if (s === matchSym || s === "wild") count++;
        else break;
      }
      if (count >= 2) {
        const payTable = matchSym === "wild" ? WILD_PAY : SYMBOLS[matchSym].pay;
        const payMult = payTable[count] || 0;
        if (payMult > 0) {
          const win = lineBet * payMult;
          totalBase += win;
          winningLines.push({ line: line.name, symbol: matchSym, count, win });
          for (let i = 0; i < count; i++) {
            const [c, r] = line.cells[i];
            winningCells.add(c + "," + r);
          }
        }
      }
    }

    const wildCols = grid.filter((g) => g.wild);
    const multiplierSum = wildCols.reduce((s, g) => s + g.mult, 0) || 1;
    const total = totalBase * multiplierSum;

    return { total, totalBase, multiplierSum, winningCells, winningLines, wildCols };
  }

  /* ---------------- Coin burst effect ---------------- */
  function coinBurst(count = 16) {
    for (let i = 0; i < count; i++) {
      const c = document.createElement("div");
      c.className = "coin";
      c.textContent = Math.random() < 0.5 ? "🪙" : "✨";
      c.style.left = Math.random() * 100 + "%";
      c.style.animationDuration = (0.9 + Math.random() * 0.8) + "s";
      c.style.animationDelay = Math.random() * 0.4 + "s";
      el.winOverlay.appendChild(c);
      setTimeout(() => c.remove(), 2200);
    }
  }

  /* ---------------- UI updates ---------------- */
  function updateBalanceUI() {
    el.balanceValue.textContent = fmt(state.balance);
    el.balanceValue2.textContent = fmt(state.balance);
  }
  function updateBetUI() {
    el.betValue.textContent = fmt(bet());
    el.betValue2.textContent = fmt(bet());
  }
  function setMessage(msg) {
    el.messageText.textContent = msg;
  }
  function updateMeterUI() {
    const pct = Math.min(100, (state.meter / state.meterGoal) * 100);
    el.meterFill.style.width = pct + "%";
    el.meterCount.textContent = state.meter;
  }

  function showBigWin(amount) {
    let label = "ÓTIMA VITÓRIA";
    if (amount >= bet() * 50) label = "VITÓRIA ÉPICA";
    else if (amount >= bet() * 20) label = "GRANDE VITÓRIA";
    el.bigwinLabel.textContent = label;
    el.bigwinAmount.textContent = fmt(0);
    el.bigwin.classList.add("show");
    animateCount(0, amount, 900, (v) => { el.bigwinAmount.textContent = fmt(v); });
    sfx.bigwin();
    setTimeout(() => el.bigwin.classList.remove("show"), 1700);
  }

  function animateCount(from, to, duration, onUpdate) {
    const start = performance.now();
    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      onUpdate(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  async function showFsBanner(title, sub, duration = 1800) {
    el.fsTitle.textContent = title;
    el.fsSub.textContent = sub;
    el.fsBanner.classList.add("open");
    sfx.bonus();
    await wait(duration);
    el.fsBanner.classList.remove("open");
  }

  function wait(ms) { return new Promise((res) => setTimeout(res, ms)); }

  /* ---------------- Spin flow ---------------- */
  async function spin() {
    if (state.isSpinning) return;

    const cost = state.inFreeSpins ? 0 : bet();
    if (!state.inFreeSpins && state.balance < cost) {
      topUpDemoBalance();
    }
    if (!state.inFreeSpins) {
      state.balance -= cost;
      updateBalanceUI();
    }

    state.isSpinning = true;
    el.spinBtn.disabled = true;
    el.spinBtn.classList.add("spinning");
    clearWinGlow();
    el.winOverlay.innerHTML = "";

    setSpinningVisual(true);
    const spinDuration = state.turbo ? 320 : 700;
    const tickInterval = setInterval(() => sfx.tick(), 90);
    await wait(spinDuration);
    clearInterval(tickInterval);

    const grid = generateGrid();
    state.grid = grid;
    sfx.reelStop();
    renderGrid(grid);

    const result = evaluateWin(grid);

    if (result.wildCols.length > 0) {
      sfx.wild();
      if (!state.inFreeSpins) {
        state.meter = Math.min(state.meterGoal, state.meter + 1);
        updateMeterUI();
      }
    }

    if (result.total > 0) {
      renderGrid(grid, { winningCells: result.winningCells });
      state.balance += result.total;
      if (state.inFreeSpins) state.freeSpinsWin += result.total;
      updateBalanceUI();
      coinBurst(Math.min(26, 8 + Math.floor(result.total)));
      sfx.win();
      setMessage(`Vitória: ${fmt(result.total)}` + (result.multiplierSum > 1 ? ` (x${result.multiplierSum})` : ""));
      if (result.total >= bet() * 12) showBigWin(result.total);
    } else {
      setMessage(FLAVOR_MESSAGES[Math.floor(Math.random() * FLAVOR_MESSAGES.length)]);
    }

    // Free spins trigger (outside bonus only)
    if (!state.inFreeSpins && state.meter >= state.meterGoal) {
      state.meter = 0;
      updateMeterUI();
      await enterFreeSpins();
    } else if (state.inFreeSpins) {
      state.freeSpinsLeft--;
      if (state.freeSpinsLeft <= 0) {
        await exitFreeSpins();
      } else {
        setMessage(`Rodada Grátis — faltam ${state.freeSpinsLeft}`);
      }
    }

    state.isSpinning = false;
    el.spinBtn.classList.remove("spinning");
    el.spinBtn.disabled = false;

    if (state.autoSpinsLeft > 0) {
      state.autoSpinsLeft--;
      if (state.autoSpinsLeft === 0) el.autoBtn.classList.remove("active");
      await wait(state.turbo ? 220 : 450);
      spin();
    }
  }

  function clearWinGlow() {
    document.querySelectorAll(".cell.win-glow").forEach((c) => c.classList.remove("win-glow"));
  }

  async function enterFreeSpins() {
    state.inFreeSpins = true;
    state.freeSpinsTotal = 8;
    state.freeSpinsLeft = 8;
    state.freeSpinsWin = 0;
    await showFsBanner("RODADAS GRÁTIS!", "8 rodadas com Wilds turbinados ativadas");
    setMessage("Rodadas Grátis ativadas!");
  }

  async function exitFreeSpins() {
    const totalWin = state.freeSpinsWin;
    state.inFreeSpins = false;
    await showFsBanner("FIM DAS RODADAS GRÁTIS", `Você ganhou ${fmt(totalWin)}`, 2200);
    setMessage("Boa sorte!");
  }

  function topUpDemoBalance() {
    state.balance += state.startingBalance;
    setMessage("Saldo demo recarregado");
  }

  /* ---------------- Bet modal ---------------- */
  function renderBetTable() {
    el.betTableBody.innerHTML = "";
    BET_LEVELS.forEach((level, idx) => {
      const tr = document.createElement("tr");
      if (idx === state.betIndex) tr.classList.add("selected");
      const coinValue = (level / 25).toFixed(2).replace(".", ",");
      tr.innerHTML = `<td>R$${coinValue}</td><td>${idx + 4}</td><td>5</td><td>${fmt(level)}</td>`;
      tr.addEventListener("click", () => {
        state.betIndex = idx;
        renderBetTable();
      });
      el.betTableBody.appendChild(tr);
    });
  }

  function openBetModal() {
    renderBetTable();
    el.betModalBackdrop.classList.add("open");
  }
  function closeBetModalFn() {
    el.betModalBackdrop.classList.remove("open");
  }

  /* ---------------- Clock ---------------- */
  function tickClock() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    el.clock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  /* ---------------- Wire events ---------------- */
  function wireEvents() {
    el.spinBtn.addEventListener("click", spin);

    el.minusBtn.addEventListener("click", () => {
      if (state.isSpinning) return;
      state.betIndex = Math.max(0, state.betIndex - 1);
      updateBetUI();
    });
    el.plusBtn.addEventListener("click", () => {
      if (state.isSpinning) return;
      state.betIndex = Math.min(BET_LEVELS.length - 1, state.betIndex + 1);
      updateBetUI();
    });

    el.turboBtn.addEventListener("click", () => {
      state.turbo = !state.turbo;
      el.turboBtn.classList.toggle("active", state.turbo);
    });

    el.autoBtn.addEventListener("click", () => {
      if (state.autoSpinsLeft > 0) {
        state.autoSpinsLeft = 0;
        el.autoBtn.classList.remove("active");
        setMessage("Autoplay cancelado");
        return;
      }
      state.autoSpinsLeft = 20;
      el.autoBtn.classList.add("active");
      if (!state.isSpinning) spin();
    });

    el.soundBtn.addEventListener("click", () => {
      state.soundOn = !state.soundOn;
      el.soundBtn.textContent = state.soundOn ? "🔊" : "🔇";
    });

    el.menuBtn.addEventListener("click", () => {
      setMessage("Isto é uma demo — sem conta, sem dinheiro real.");
    });

    el.openBetModal.addEventListener("click", openBetModal);
    el.closeBetModal.addEventListener("click", closeBetModalFn);
    el.betModalBackdrop.addEventListener("click", (e) => {
      if (e.target === el.betModalBackdrop) closeBetModalFn();
    });
    el.maxBetBtn.addEventListener("click", () => {
      state.betIndex = BET_LEVELS.length - 1;
      renderBetTable();
    });
    el.confirmBetBtn.addEventListener("click", () => {
      updateBetUI();
      closeBetModalFn();
    });
  }

  /* ---------------- Init ---------------- */
  function init() {
    state.balance = state.startingBalance;
    buildReelDom();
    state.grid = generateGrid();
    // ensure a visually pleasant initial board (not forced wild)
    renderGrid(state.grid);
    updateBalanceUI();
    updateBetUI();
    updateMeterUI();
    wireEvents();
    tickClock();
    setInterval(tickClock, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
