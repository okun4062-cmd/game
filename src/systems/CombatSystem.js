export function pointerVector(player, pointerWorld) {
  const dx = pointerWorld.x - player.x, dy = pointerWorld.y - player.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}
export function primaryAction({ player, weapon = { kind: 'melee', damage: 12 }, pointerWorld, enemies = [], inventory }) {
  const direction = pointerVector(player, pointerWorld);
  player.facing = direction.x < 0 ? -1 : 1;
  if (weapon.kind === 'ranged') {
    if (inventory && inventory.items.ammo <= 0) return { type: 'empty', direction };
    if (inventory) inventory.items.ammo--;
    return { type: 'projectile', x: player.x + direction.x * 14, y: player.y + direction.y * 14, vx: direction.x * 420, vy: direction.y * 420, damage: weapon.damage, direction };
  }
  const hit = enemies.find(enemy => enemy.hp > 0 && Math.hypot(enemy.x - player.x, enemy.y - player.y) < (weapon.range || 54) && ((enemy.x - player.x) * direction.x + (enemy.y - player.y) * direction.y) > 0);

  return { type: 'melee', direction, target: hit || null, damage: hit ? weapon.damage : 0 };
}


