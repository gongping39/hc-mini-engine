export type ReplayEvent = { t:number; k:"down"|"up"; code:string };
export type Replay = {
  seed:number; startedAt:number; level?:string; spec?:string;
  events: ReplayEvent[];
};