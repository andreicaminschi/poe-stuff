/** Mirrors apps/training/rows.py. A prompt that differs from training costs accuracy. */

export const FILL_SYSTEM = "You fill the params of one admin-panel command. Answer with one JSON object and nothing else. Copy names exactly as the request writes them. Answer {\"refuse\": \"missing-target\"} when the context has no name the request needs.";

export type Request = { readonly query: string; readonly context: string };

export type Turn = Request & { readonly history: readonly string[] };

export const describeRequest = (request: Request): string => `request: ${request.query}\ncontext:\n${request.context}`;

/** The request, what the panel holds now, and what already ran. Low, Sonar 0. */
export const describeTurn = (turn: Turn): string =>
  `${describeRequest(turn)}\nalready run: ${turn.history.length === 0
    ? "nothing"
    : turn.history.join("; ")}`;

/** The filler's user message: the request, the command, and its fields. Low, Sonar 0. */
export const writeFillUser = (request: Request, command: string, fields: string): string =>
  `${describeRequest(request)}\ncommand: ${command}\nparams: ${fields}`;
