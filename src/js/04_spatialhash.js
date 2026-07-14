// ======================== 5. SPATIAL HASH ========================
class SpatialHash {
  constructor(cellSize) {
    this.cs = cellSize;
    this.cols = Math.ceil(CFG.WORLD_W / cellSize);
    this.rows = Math.ceil(CFG.WORLD_H / cellSize);
    this.gen = 0;
    this.cells = new Array(this.cols * this.rows);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = { items: [], gen: 0 };
    }
  }
  clear() { this.gen++; }  // O(1) generation counter — zero allocations
  key(x, y) {
    const cx = Math.floor(x / this.cs), cy = Math.floor(y / this.cs);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return -1;
    return cy * this.cols + cx;
  }
  insert(obj) {
    const k = this.key(obj.x, obj.y);
    if (k >= 0) {
      const cell = this.cells[k];
      if (cell.gen !== this.gen) { cell.items.length = 0; cell.gen = this.gen; }
      cell.items.push(obj);
      obj._hashKey = k;
    }
  }
  query(x, y, radius) {
    return this.queryInto(x, y, radius, []);
  }
  queryInto(x, y, radius, out) {
    out.length = 0;
    const minCX = Math.max(0, Math.floor((x - radius) / this.cs));
    const maxCX = Math.min(this.cols - 1, Math.floor((x + radius) / this.cs));
    const minCY = Math.max(0, Math.floor((y - radius) / this.cs));
    const maxCY = Math.min(this.rows - 1, Math.floor((y + radius) / this.cs));
    for (let cy = minCY; cy <= maxCY; cy++) {
      for (let cx = minCX; cx <= maxCX; cx++) {
        const cell = this.cells[cy * this.cols + cx];
        if (cell.gen === this.gen) {
          for (let i = 0; i < cell.items.length; i++) out.push(cell.items[i]);
        }
      }
    }
    return out;
  }
}