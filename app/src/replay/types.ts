export type ReplayEvent = { 
  t: number; 
  k: "down" | "up"; 
  c: string; 
};

export type Replay = { 
  seed: number; 
  startedAt: number; 
  events: ReplayEvent[]; 
};