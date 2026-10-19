// preload imports this; keep it dependency-free
export const CHANNEL_NAMES = [
  "panel:view",
  "panel:versions",
  "panel:open",
  "panel:dispatch",
  "panel:undo",
  "panel:save",
  "agent:models",
  "agent:plan",
  "agent:approve",
  "agent:reject",
  "agent:dismiss",
] as const;

export type ChannelName = (typeof CHANNEL_NAMES)[number];
