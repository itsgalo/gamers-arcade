// ============================================
// LEADERBOARD — single-page textmode site
// Reuses text-grid.js, flap.js, and the same
// HTML/CSS as the main site (grid-container).
// ============================================

import { TextGrid } from './text-grid.js';
import { Flap } from './flap.js';

// '' if this page is served from the game server's ./public folder.
// Otherwise the full origin, e.g. 'https://game.yourdomain.com'
// (and that page's origin must be in the server's allowedOrigins).
const API_BASE = '';
const REFRESH_MS = 30000;
const MAX_ROWS = 10;

class LeaderboardSite {
  constructor() {
    this.container = document.getElementById('grid-container');
    this.cellW = 20;
    this.cellH = 40;
    this.cols = 64;
    this.rows = 40;
    this.cells = [];
    this.flaps = [];
    this.activeFlaps = new Set();

    this.scores = null;   // null = loading, [] = empty, array = data
    this.error = false;

    this.charSet = `☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼ !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_abcdefghijklmnopqrstuvwxyz{|}~⌂ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀ɑϐᴦᴨ∑ơµᴛɸϴΩẟ∞∅∈∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■`;

    this.init();
    this.animate();
    this.loadScores();
    setInterval(() => this.loadScores(), REFRESH_MS);
  }

  init() {
    this.container.style.setProperty('--cols', this.cols);
    this.container.style.setProperty('--rows', this.rows);
    this.container.innerHTML = '';
    this.cells = [];

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = document.createElement('span');
        cell.className = 'cell';
        cell.textContent = ' ';
        cell.style.animationDelay = `${(row) * 0.05}s`;
        cell.dataset.col = col;
        cell.dataset.row = row;
        this.container.appendChild(cell);
        this.cells.push({ el: cell, col, row, flap: null, targetChar: ' ' });
      }
    }

    const canvas = { width: this.cols * this.cellW, height: this.rows * this.cellH };
    this.layout = new TextGrid(canvas, this.cellW, this.cellH);

    this.setupInteraction();
    this.render();
  }

  getCellAt(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.cells[row * this.cols + col];
  }

  // --------------------------------------------
  // DATA
  // --------------------------------------------
  async loadScores() {
    try {
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      this.scores = await res.json();
      this.error = false;
    } catch (err) {
      console.error('leaderboard fetch failed:', err);
      this.error = true;
    }
    this.render();
  }

  // --------------------------------------------
  // LAYOUT
  // --------------------------------------------
  render() {
    const hud = this.layout;
    hud.clear();

    const green = [0.78, 0.97, 0.77, 1];
    const dim = [0.23, 0.35, 0.22, 1];
    const accent = [1, 0.42, 0.21, 1];

    // Corner brackets + status bar
    hud.bracket(2, 1, 8, 3, 'tl', dim, true);
    hud.bracket(hud.fromRight(9), 1, 8, 3, 'tr', dim, true);
    hud.bracket(2, hud.fromBottom(3), 8, 3, 'bl', dim, true);
    hud.bracket(hud.fromRight(9), hud.fromBottom(3), 8, 3, 'br', dim, true);
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    hud.text(4, hud.fromBottom(1), `SYS.TIME: ${time}`, dim, true);
    const coords = `[${this.cols}x${this.rows}]`;
    hud.text(hud.fromRight(coords.length + 3), hud.fromBottom(1), coords, dim, true);

    // Title
    const title = 'HIGH SCORES';
    hud.text(hud.cx - Math.floor(title.length / 2), 3, title, accent, false);
    const subtitle = '[ TOP PLAYERS — ALL TIME ]';
    hud.text(hud.cx - Math.floor(subtitle.length / 2), 5, subtitle, dim, false);

    // Table box
    const boxW = Math.min(60, this.cols - 8);
    const boxH = Math.min(26, this.rows - 12);
    const boxX = hud.cx - Math.floor(boxW / 2);
    const boxY = 7;
    hud.box(boxX, boxY, boxW, boxH, green, false);

    const innerX = boxX + 4;
    const innerW = boxW - 8;

    if (this.error) {
      hud.text(innerX, boxY + 3, '!! CONNECTION ERROR — RETRYING', accent, false);
    } else if (this.scores === null) {
      hud.text(innerX, boxY + 3, 'CONNECTING TO SERVER', green, false);
      hud.text(innerX + 21, boxY + 3, '_', accent, false, { blink: true });
    } else if (this.scores.length === 0) {
      hud.text(innerX, boxY + 3, 'NO SCORES RECORDED YET', dim, false);
    } else {
      // Column header + rule
      hud.text(innerX, boxY + 2, 'RK  TOKEN       OWNER', dim, false);
      hud.text(innerX + innerW - 5, boxY + 2, 'SCORE', dim, false);
      hud.text(innerX, boxY + 3, '─'.repeat(innerW), dim, true);

      this.scores.slice(0, MAX_ROWS).forEach((row, i) => {
        const rank = String(i + 1).padStart(2, '0');
        const token = ('#' + row.tokenId).padEnd(11).slice(0, 11);
        const owner = (row.address.slice(0, 6) + '..' + row.address.slice(-4)).toUpperCase();
        const score = String(row.best);

        const left = `${rank}  ${token} ${owner}`;
        const dots = '.'.repeat(Math.max(1, innerW - left.length - score.length - 2));
        const line = `${left} ${dots} ${score}`;

        const color = i === 0 ? accent : green;
        hud.text(innerX, boxY + 5 + i * 2, line, color, false);
      });
    }

    // Arcade flourish
    const coin = '* INSERT COIN *';
    hud.text(hud.cx - Math.floor(coin.length / 2), boxY + boxH + 2, coin, accent, false, { blink: true });

    this.applyScreen();
  }

  // Flap-sweep transition to whatever is currently in this.layout
  applyScreen() {
    const instanceMap = new Map();
    this.layout.instances.forEach(inst => {
      instanceMap.set(`${inst.col},${inst.row}`, inst);
    });

    this.cells.forEach(cell => {
      const inst = instanceMap.get(`${cell.col},${cell.row}`);
      const char = inst ? (typeof inst.char === 'number' ? String.fromCharCode(inst.char) : inst.char) : ' ';
      const targetIdx = Math.max(0, this.charSet.indexOf(char));

      cell.el.className = 'cell';
      if (inst) {
        const [r, g] = inst.color;
        if (r > 0.9 && g < 0.5) cell.el.classList.add('accent');
        else if (r < 0.4 && g < 0.4) cell.el.classList.add('dim');
        if (inst.blink) cell.el.classList.add('blink');
      }

      // Skip cells that already show the right character (avoids a full
      // re-sweep on every 30s refresh — only changed cells flip)
      if (cell.targetChar === char && cell.flap && !cell.flap.isFlipping()) return;
      cell.targetChar = char;

      if (!cell.flap) {
        cell.flap = new Flap(0, this.charSet.length, targetIdx);
        this.flaps.push({ cell, flap: cell.flap });
      }
      cell.flap.target = targetIdx;
      //cell.flap.setDelay((cell.col + cell.row) * 1.5);
      cell.flap.setDelay(cell.row * 0.5);

      const flapData = this.flaps.find(f => f.cell === cell);
      if (flapData) this.activeFlaps.add(flapData);
    });
  }

  setupInteraction() {
    this.container.addEventListener('mouseover', (e) => {
      if (!e.target.classList.contains('cell')) return;
      const col = parseInt(e.target.dataset.col);
      const row = parseInt(e.target.dataset.row);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cell = this.getCellAt(col + dx, row + dy);
          if (cell && cell.flap) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            cell.flap.setRandom();
            cell.flap.delay = cell.row * 0.5;
            const flapData = this.flaps.find(f => f.cell === cell);
            if (flapData) this.activeFlaps.add(flapData);
          }
        }
      }
    });
  }

  animate() {
    this.activeFlaps.forEach(flapData => {
      const { cell, flap } = flapData;
      flap.flip();
      cell.el.textContent = this.charSet[flap.current] || ' ';
      if (!flap.isFlipping()) this.activeFlaps.delete(flapData);
    });
    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('load', () => {
  new LeaderboardSite();
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => location.reload(), 300);
  });
});