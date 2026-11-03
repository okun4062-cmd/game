# World notes

- The finite map is divided into twelve contiguous regions. Its seed determines the uneven ground, caves, chambers, mineral seams, and altar positions.
- A winding underground corridor links the surface entrance to side caves and to the twelve dungeon chambers.
- The dungeons are part of the world from the start. Interacting with a local altar awakens that dungeon's unique guardian.
- Only one guardian can be active at a time. Defeated dungeon IDs are serialized locally and remain cleared after reload.
- World terrain edits, player position, resources, weapons, and ammunition are saved in `localStorage`.
- Phaser uses pixel-art rendering and FIT scaling at a 480 × 270 logical resolution. Chunk textures are generated near the camera and discarded outside its view.

