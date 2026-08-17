const url = process.env.POE_STATS_URL;
if (!url) throw new Error("POE_STATS_URL is not set (run via `yarn parse-stats`)");

// GGG's Cloudflare returns 403 for requests without a descriptive User-Agent.
const res = await fetch(url, {
  headers: { "User-Agent": "OAuth poe-stuff/1.0 (contact: andrei.caminschi1988@gmail.com)" },
});
if (!res.ok) throw new Error(`${url} -> ${res.status} ${res.statusText}`);

type StatsResponse = {
  result: Array<{
    id: string;
    label: string;
    entries: Array<{ id: string; text: string; type: string }>;
  }>;
};

const { result } = (await res.json()) as StatsResponse;

for (const group of result) {
  console.log(`${group.label}: ${group.entries.length} stats`);
}
