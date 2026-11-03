export class DungeonSystem {
  constructor(dungeons, cleared = [], persist = () => {}) {
    this.dungeons = dungeons;
    this.cleared = new Set(cleared);
    this.activeId = null;
    this.persist = persist;
  }
  activate(dungeonId) {
    const dungeon = this.dungeons.find(d => d.id === dungeonId);
    if (!dungeon || this.cleared.has(dungeonId) || this.activeId) return null;
    this.activeId = dungeonId;
    return { id: dungeon.guardianId, dungeonId, biomeId: dungeon.biomeId };
  }
  defeat(dungeonId) {
    if (this.activeId !== dungeonId || !this.dungeons.some(d => d.id === dungeonId)) return false;
    this.activeId = null;
    this.cleared.add(dungeonId);
    this.persist([...this.cleared]);
    return true;
  }
  isCleared(id) { return this.cleared.has(id); }
  exportCleared() { return [...this.cleared].sort(); }
}
