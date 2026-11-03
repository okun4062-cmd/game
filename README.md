# NOCTURNE · The Open Deep

A browser pixel adventure built with Phaser 4.2.1. Explore a seeded open world of twelve biomes, connected caverns, mining veins, craftable weapons, roaming creatures, and one guardian dungeon per biome.

## Play

Open the GitHub Pages build: https://okun4062-cmd.github.io/game/

- **A / D** or **← / →** — move
- **Space / W / ↑** — jump
- **Left mouse button** — swing at the cursor, or shoot the equipped pistol toward the cursor's world position
- **F** — mine the block under the cursor
- **E** — awaken a nearby dungeon altar
- **C** — craft a pistol or ammunition from gathered materials
- **1 / 2** — equip the blade or pistol
- **I** — open the inventory
- Touch controls appear on phones and tablets.

The new world is generated from a seed and saved in local storage. Dungeon guardians can only be awakened at their altar. Each dungeon has a unique guardian; after its defeat the clear is permanent and that guardian cannot spawn again.

Older NOCTURNE saves are read from `nocturne-eclipse-save-v2`; material bags, ammunition, owned weapons, equipped weapon, and defeated guardian progress are carried into the new world where available.

## Develop

No build step is required. Serve this directory over HTTP and open `index.html`; Phaser is loaded from its pinned jsDelivr CDN URL. Run the pure-system tests with:

```sh
node --test
```

GitHub Pages serves the repository root as a static site.
