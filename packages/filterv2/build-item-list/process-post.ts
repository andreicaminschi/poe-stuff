import { askClaude } from "./ask-claude.ts";
import type { ForumPost, ProcessedPost } from "../types.ts";

const PROMPT = [
  "Below is a Path of Exile Item Filter Information post from GGG's forum.",
  "",
  "Return JSON, and nothing else, in this shape:",
  '{"newItems":[{"itemClass":"Stackable Currency","names":["Scrying Orb"]}],',
  ' "renamed":[{"from":"Dark Pact","to":"Dark Bargain"}],',
  ' "removed":["Bonespire Talisman"],',
  ' "newKeywords":["Vestigial"]}',
  "",
  "Rules:",
  "- Copy every name exactly as the post writes it.",
  "- Only report what the post states. Do not add items from your own knowledge.",
  "- An empty array is the right answer for a section the post does not have.",
  "",
  "POST:",
].join("\n");

/** The first JSON object in a reply, whatever prose or fencing surrounds it. */
const readJson = (reply: string): Record<string, unknown> => {
  const open = reply.indexOf("{");
  const close = reply.lastIndexOf("}");
  if (open < 0 || close <= open) return {};

  try {
    return JSON.parse(reply.slice(open, close + 1)) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

export type ProcessOptions = {
  readonly post: ForumPost;
  /** The post's text, already extracted. What the checksum was taken over. */
  readonly lines: readonly string[];
  readonly textChecksum: string;
  readonly model: string;
};

/**
 * Read one post with the model.
 *
 * The caller has the text and its checksum already, and only reaches this when the two do
 * not match what is stored. Everything here costs a model call, so nothing calls it to
 * find out whether it needed to.
 */
export async function processPost({
  post,
  lines,
  textChecksum,
  model,
}: ProcessOptions): Promise<ProcessedPost> {
  const reply = await askClaude(`${PROMPT}\n${lines.join("\n")}`, model);
  const parsed = readJson(reply);

  return {
    post,
    processedAt: new Date().toISOString(),
    textChecksum,
    newItems: asArray(parsed["newItems"]),
    renamed: asArray(parsed["renamed"]),
    removed: asArray(parsed["removed"]),
    newKeywords: asArray(parsed["newKeywords"]),
  };
}
