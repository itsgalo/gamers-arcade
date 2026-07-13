// ============================================
// HUD LAYOUT CLASS
// ============================================
export class TextGrid {
  constructor(canvas, cellWidth, cellHeight) {
    this.cellW = cellWidth;
    this.cellH = cellHeight;
    this.cols = Math.floor(canvas.width / cellWidth);
    this.rows = Math.floor(canvas.height / cellHeight);
    this.instances = [];
  }

  get cx() { return Math.floor(this.cols / 2); }
  get cy() { return Math.floor(this.rows / 2); }

  fromRight(offset) { return this.cols - 1 - offset; }
  fromBottom(offset) { return this.rows - 1 - offset; }

  colAt(pct) { return Math.floor(this.cols * pct); }
  rowAt(pct) { return Math.floor(this.rows * pct); }

  gridToWorld(col, row) {
    return {
      x: col * this.cellW + this.cellW / 2,
      y: row * this.cellH + this.cellH / 2
    };
  }

  putChar(col, row, char = 0, color = [1,1,1,1], still, meta = {}) {
    const pos = this.gridToWorld(col, row);
    this.instances.push({ ...pos, char, color, col, row, still, ...meta });
  }

  hLine(col, row, length, char = '-'.charCodeAt(0), color = [1,1,1,1], still) {
    for (let i = 0; i < length; i++) {
      this.putChar(col + i, row, char, color, still);
    }
  }

  vLine(col, row, length, char = '|'.charCodeAt(0), color = [1,1,1,1], still) {
    for (let i = 0; i < length; i++) {
      this.putChar(col, row + i, char, color, still);
    }
  }

  box(col, row, width, height, color = [1,1,1,1], still) {
    this.putChar(col, row, '╔'.charCodeAt(0), color, still);
    this.putChar(col + width - 1, row, '╗'.charCodeAt(0), color, still);
    this.putChar(col, row + height - 1, '╚'.charCodeAt(0), color, still);
    this.putChar(col + width - 1, row + height - 1, '╝'.charCodeAt(0), color, still);
    this.hLine(col + 1, row, width - 2, '═'.charCodeAt(0), color, still);
    this.hLine(col + 1, row + height - 1, width - 2, '═'.charCodeAt(0), color, still);
    this.vLine(col, row + 1, height - 2, '║'.charCodeAt(0), color, still);
    this.vLine(col + width - 1, row + 1, height - 2, '║'.charCodeAt(0), color, still);
  }

  text(col, row, str, color = [1,1,1,1], still, meta = {}) {
    for (let i = 0; i < str.length; i++) {
      this.putChar(col + i, row, str.charCodeAt(i), color, still, meta);
    }
  }

  crosshair(centerCol, centerRow, size, color = [1,1,1,1], still) {
    for (let i = 1; i <= size; i++) {
      this.putChar(centerCol - i, centerRow, '-'.charCodeAt(0), color, still);
      this.putChar(centerCol + i, centerRow, '-'.charCodeAt(0), color, still);
    }
    for (let i = 1; i <= size; i++) {
      this.putChar(centerCol, centerRow - i, '|'.charCodeAt(0), color, still);
      this.putChar(centerCol, centerRow + i, '|'.charCodeAt(0), color, still);
    }
    this.putChar(centerCol, centerRow, '+'.charCodeAt(0), color, still);
  }

  circle(centerCol, centerRow, radius, char = '*'.charCodeAt(0), color = [1,1,1,1], still) {
    let x = radius, y = 0, d = 1 - radius;
    const plot8 = (cx, cy) => {
      this.putChar(centerCol + cx, centerRow + cy, char, color, still);
      this.putChar(centerCol - cx, centerRow + cy, char, color, still);
      this.putChar(centerCol + cx, centerRow - cy, char, color, still);
      this.putChar(centerCol - cx, centerRow - cy, char, color, still);
      this.putChar(centerCol + cy, centerRow + cx, char, color, still);
      this.putChar(centerCol - cy, centerRow + cx, char, color, still);
      this.putChar(centerCol + cy, centerRow - cx, char, color, still);
      this.putChar(centerCol - cy, centerRow - cx, char, color, still);
    };
    while (x >= y) {
      plot8(x, y);
      y++;
      if (d < 0) {
        d += 2 * y + 1;
      } else {
        x--;
        d += 2 * (y - x) + 1;
      }
    }
  }

  arc(centerCol, centerRow, radius, startAngle, endAngle, steps = 16, char = '.'.charCodeAt(0), color = [1,1,1,1], still) {
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = startAngle + t * (endAngle - startAngle);
      const c = Math.round(centerCol + Math.cos(angle) * radius);
      const r = Math.round(centerRow + Math.sin(angle) * radius * 0.5);
      this.putChar(c, r, char, color, still);
    }
  }

  bracket(col, row, w, h, corner, color, still) {
    const hc = corner[1] === 'l' ? col : col + w - 1;
    const vc = corner[0] === 't' ? row : row + h - 1;
    const hdir = corner[1] === 'l' ? 1 : -1;
    const vdir = corner[0] === 't' ? 1 : -1;
    this.putChar(hc, vc, '+'.charCodeAt(0), color, still);
    for (let i = 1; i < w; i++) this.putChar(hc + i * hdir, vc, '-'.charCodeAt(0), color, still);
    for (let i = 1; i < h; i++) this.putChar(hc, vc + i * vdir, '|'.charCodeAt(0), color, still);
  }

  clear() {
    this.instances = [];
  }
}