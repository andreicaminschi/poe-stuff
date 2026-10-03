/** Mirrors apps/training/rows.py. A prompt that differs from training costs accuracy. */

export const STOP_QUESTION = "is the request complete?";

const FILL_SYSTEM = "You fill the params of one admin-panel command. Answer with one JSON object and nothing else. Copy names exactly as the request writes them.";

export type Turn = { readonly query: string; readonly context: string; readonly history: readonly string[] };

const describeTurn = (turn: Turn): string =>
  `request: ${turn.query}\ncontext:\n${turn.context}\nalready run: ${turn.history.length === 0
    ? "nothing"
    : turn.history.join("; ")}`;

export const writeDecideText = (turn: Turn, question: string): string => `${describeTurn(turn)}\nquestion: ${question}`;

export const writeCommandQuestion = (command: string): string => `is ${command} the next command?`;

/** Qwen's chat format, as its template writes a system and a user message. Low, Sonar 0. */
export const writeFillPrompt = (turn: Turn, command: string): string =>
  `<|im_start|>system\n${FILL_SYSTEM}<|im_end|>\n<|im_start|>user\n${describeTurn(turn)}\ncommand: ${command}<|im_end|>\n<|im_start|>assistant\n`;
