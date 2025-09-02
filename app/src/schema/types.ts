export type GameSpec = {
  title?: string;
  gameLoop: "runner";
  scrollSpeed: number;
  gravity: number;
  jumpForce: number;
  artStyle?: { theme?: string; sfx?: "arcade" | "none" };
  player?: { hitbox?: [number, number]; jumpBufferMs?: number };
  obstacle?: { spawnRate: number; gapMin?: number; gapMax?: number };
  levelSections?: Array<{ len: number; density: number; boost?: boolean }>;
};