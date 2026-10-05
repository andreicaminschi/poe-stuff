/** Mirrors apps/training/rows.py. A prompt that differs from training costs accuracy. */

export const FILL_SYSTEM = "You fill the params of one admin-panel command. Answer with one JSON object and nothing else. Copy names exactly as the request writes them. Answer {\"refuse\": \"missing-target\"} when the context has no name the request needs.";

export type Request = { readonly query: string; readonly context: string };

export const describeRequest = (request: Request): string => `request: ${request.query}\ncontext:\n${request.context}`;

/** The filler's user message: the request, the command, and its fields. Low, Sonar 0. */
export const writeFillUser = (request: Request, command: string, fields: string): string =>
  `${describeRequest(request)}\ncommand: ${command}\nparams: ${fields}`;
