export class ChunkManager {
  constructor(world, chunkSize = 32, edits = {}) {
    this.world = world;
    this.chunkSize = chunkSize;
    this.edits = new Map(Object.entries(edits).map(([key, value]) => [key, value]));
  }
  getTile(x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= this.world.width || y >= this.world.height) return null;
    const key = `${x},${y}`;
    return this.edits.has(key) ? this.edits.get(key) : this.world.tiles[y * this.world.width + x];
  }
  setTile(x, y, tileId) {
    if (this.getTile(x, y) === null) return false;
    this.edits.set(`${x},${y}`, tileId);
    return true;
  }
  exportEdits() { return Object.fromEntries(this.edits); }
  getVisibleChunks(bounds) {
    const { width, height } = this.world;
    const size = this.chunkSize;
    const left = Math.max(0, Math.floor(bounds.x / size));
    const top = Math.max(0, Math.floor(bounds.y / size));
    const right = Math.min(Math.ceil(width / size) - 1, Math.floor((bounds.x + bounds.width) / size));
    const bottom = Math.min(Math.ceil(height / size) - 1, Math.floor((bounds.y + bounds.height) / size));
    const chunks = [];
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) chunks.push({ x, y, startX: x * size, startY: y * size, width: Math.min(size, width - x * size), height: Math.min(size, height - y * size) });
    return chunks;
  }
}
