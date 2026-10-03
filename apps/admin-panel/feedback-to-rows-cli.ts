import { createLakeService } from "@poe/lake/service";
import { feedbackToRows } from "./feedback-to-rows.ts";
import type { FeedbackRecord } from "./panel-api.ts";

const FEEDBACK = "admin-panel/agent-feedback";
const OUTPUT = "training/feedback/training-data";

const main = async (): Promise<void> => {
  const lake = createLakeService();
  const files = (await lake.list(FEEDBACK)).filter((file) => file.endsWith(".json"));
  const records = await Promise.all(files.map((file) => lake.readJson<FeedbackRecord>(`${FEEDBACK}/${file}`)));
  const { skipped, ...rows } = feedbackToRows(records);

  for (const [kind, list] of Object.entries(rows)) await lake.writeJson(`${OUTPUT}/${kind}.json`, list);
  console.log(`${String(records.length)} interactions: ${String(rows.request.length)} kept, ${String(skipped)} skipped (rejected or no longer runnable). Rows in .s3/${OUTPUT}/`);
};

await main();
