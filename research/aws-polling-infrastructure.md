# AWS polling infrastructure — design findings

Distributing a rate-limited polling workload across multiple source IPs on AWS.

Worked out 2026-08-15. All prices are **us-east-1, on-demand, Linux**, and are
from memory rather than a live pricing page — verify before committing.

---

## The requirement

Poll a third-party IPv4 API that rate-limits per source IP. The environment is
owned but not reconfigurable, so the limits cannot be raised at the source.

- ~3,000 requests/day, needs to scale
- Payload 10–100 KB per response
- Results are paginated; first 3 pages must be retrieved and stored
- Source IPs must be distinct enough that limit buckets don't collide
- IP rotation acceptable but not required

**Work unit = 1 search call + 3 page fetches.** This ratio drives everything
below.

---

## The rate limits

Two endpoint classes, each with four nested tiers. Format is
`limit per window → penalty on trip`.

### Search endpoint

| Tier | Penalty | Sustained equivalent |
|---|---|---|
| 5 per 10s | 60s | 1,800/hr |
| 15 per 60s | 300s | 900/hr |
| 30 per 300s | 1,800s (30 min) | 360/hr |
| **600 per 21,600s (6h)** | **3,600s (1h)** | **100/hr** |

### Fetch endpoint

| Tier | Penalty | Sustained equivalent |
|---|---|---|
| 12 per 4s | 10s | 10,800/hr |
| 16 per 12s | 300s | 4,800/hr |
| 50 per 300s | 300s | 600/hr |
| **1,000 per 21,600s (6h)** | **1,800s (30 min)** | **167/hr** |

**Only the 6h tier governs volume.** The three short windows govern burst
shape and are nowhere near binding at this scale.

---

## Key finding: fetch is the bottleneck, not search

The endpoint with the *higher* limit is the constraint, because it's called 3×
per work unit.

| Endpoint | 6h allowance | Calls per unit | Units per 6h |
|---|---|---|---|
| Search | 600 | 1 | 600 |
| **Fetch** | **1,000** | **3** | **333 ← binds** |

Theoretical ceiling: **1,333 work units/day per IP.**

Planning figure at 60% utilization: **800 work units/day per IP**
(= 800 search + 2,400 fetch = 3,200 API calls/day).

### Why 60% and not higher

The 6h tier is the one you must never trip. Tripping search costs a 60-minute
lockout; the window is presumably rolling, so you return to a nearly-full
bucket and can only trickle afterward. Recovery is far more expensive than the
penalty duration alone suggests. Headroom is cheap ($3.65/IP/mo); a tripped 6h
tier is not.

---

## Sizing

At 3,000 work units/day (= 12,000 API calls/day):

- Minimum: 4 IPs (3.75 rounded up)
- **Recommended: 6 IPs** → 500 units/IP/day
  - search: 125 per 6h = 21% of allowance
  - fetch: 375 per 6h = 37% of allowance
  - roughly 2× headroom before anything needs to change

> If the 3,000/day figure meant total API calls rather than work units, divide
> by 4 — that's 750 units/day, and one t4g.nano with 4 IPs at ~$18/mo covers
> it. **This is still unconfirmed.**

---

## Architecture

One EC2 instance, N Elastic IPs, one scheduler process binding outbound
sockets to specific source IPs.

```
EventBridge/cron  →  scheduler (1 process, SQLite ledger)
                          │
                          ├── source IP 1 ─┐
                          ├── source IP 2  │  1:1 NAT to EIP
                          ├── ...          ├──────────────────→  target API
                          └── source IP 6 ─┘
                          │
                          └──→ S3 (batched gzipped NDJSON)
```

### Why one box, many IPs

Each EIP costs the same whether it sits on its own instance or shares one, so
compute should be minimized. `t4g.nano` is the cheapest per IP slot ($0.77)
but caps at 4 addresses. `t4g.small` costs slightly more per slot ($1.02) and
holds 12 — worth it here, because doubling capacity becomes "allocate more
EIPs" rather than "resize the instance".

### IP slots per instance type

From memory — **verify before sizing**:

```bash
aws ec2 describe-instance-types --instance-types t4g.nano t4g.small t4g.medium t4g.large --query "InstanceTypes[].{Type:InstanceType,ENIs:NetworkInfo.MaximumNetworkInterfaces,IPsPerENI:NetworkInfo.Ipv4AddressesPerInterface}" --output table
```

| Type | ENIs | IPv4/ENI | Slots | $/mo | $/slot |
|---|---|---|---|---|---|
| t4g.nano | 2 | 2 | 4 | $3.07 | $0.77 |
| t4g.small | 3 | 4 | 12 | $12.26 | $1.02 |
| t4g.medium | 3 | 6 | 18 | $24.53 | $1.36 |
| t4g.large | 3 | 12 | 36 | $49.06 | $1.36 |

### Networking

- **Public subnet, EIPs attached directly. No NAT Gateway** — it costs
  $32.85/mo *and* collapses every worker behind one address, defeating the
  entire purpose.
- **Amazon Linux 2023.** Its `ec2-net-utils` auto-configures secondary private
  IPs and creates per-ENI routing tables plus source-based `ip rule` entries.
  On Ubuntu the second ENI's return path breaks until you hand-roll policy
  routing.
- **SSM Session Manager, not SSH.** Zero inbound security group rules, no
  keypairs, no bastion.
- Binding: attach one EIP per secondary private IP; AWS 1:1 NATs in both
  directions. Bind the socket to the private address
  (`curl --interface 10.0.1.23`, or `source_address=(ip, 0)` on a Python
  `HTTPAdapter`'s `PoolManager`) and traffic leaves via the paired EIP.

---

## Cost

| Item | Qty | Rate | Monthly |
|---|---|---|---|
| t4g.small | 1 | $0.0168/hr | $12.26 |
| Elastic IP, in use | 6 | $0.005/hr | $21.90 |
| gp3 root, 8 GB | 1 | $0.08/GB-mo | $0.64 |
| S3 (compressed pages, batched PUTs) | ~2 GB | $0.023/GB-mo | ~$1.00 |
| Data transfer | — | ingress free | $0.00 |
| **Total** | | | **≈ $36/mo** |

**The IPs are ~60% of the bill.** Since Feb 2024 AWS charges $0.005/hr for
every public IPv4 in use — EIP or auto-assigned, attached or idle, no
exceptions. There is no architectural trick around it. A 1-year Compute
Savings Plan cuts the instance ~28% (~$3/mo saved); everything else is fixed.

### Scaling

Capacity scales linearly at **$3.65 per 800 work units/day**.

| Work units/day | API calls/day | IPs | Instance | Monthly |
|---|---|---|---|---|
| 3,000 (today) | 12,000 | 6 | t4g.small | $34 |
| 6,400 | 25,600 | 8 | t4g.small | $41 |
| 9,600 | 38,400 | 12 | t4g.small | $56 |
| 14,400 | 57,600 | 18 | t4g.medium | $90 |

Aggregate burst ceiling is `5 × N_IPs` search calls per 10s — 30 at six IPs.
Only relevant if the workload ever needs to fire a batch rather than trickle.

---

## Scheduler design

Single process on one box. Not 20 workers — the IP count is 6 and the pacing
must be centrally accounted.

- **Two independent ledgers per IP.** Search and fetch have separate buckets:
  8 sliding windows per IP, not 4. Never merge them.
- **Work units stay atomic on one IP.** Search plus its 3 fetches from the
  same address. Splitting desynchronizes the two ledgers for marginal gain.
- **LRU selection** among IPs that pass all eight window checks with margin
  (60% on the 6h tiers, 80% on the short ones).
- **On 429: park that IP's specific endpoint budget** for the stated penalty
  and requeue the unit elsewhere. Never retry into the same address.
- **Persist counters to SQLite.** A restart that forgets a half-spent 6h
  window is precisely how the expensive tier gets tripped.
- **Pace to target volume, not to the limit.** At 3,000/day the scheduler
  should be idling — one unit per IP every ~170s, executing as a ~2s burst.

### The 12s trap

12-per-4s implies 3 req/s, but 16-per-12s only permits 1.33 req/s. A limiter
that validates the shortest window first will cheerfully trip the longer one.
The real ceiling is 5 work units' worth of fetches in any 12-second span.

### Highest-value implementation detail

The `limit:window:penalty` triplet format is usually advertised in response
headers alongside a companion header reporting **current consumed state**. If
so, treat the server's reported state as authoritative and reconcile local
counters on every response.

Local-only modeling *will* drift — retries, redirects, and requests that count
against the limit but return errors all desync it. With a 6-hour rolling
window the drift is invisible until the tier trips and costs 30–60 minutes.
Header reconciliation makes the system self-correcting.

---

## Storage

9,000 pages/day at ~50 KB ≈ 450 MB/day, ~13.5 GB/month raw. Too much to
accumulate on an 8 GB root volume.

- Ship to **S3**, not EBS.
- **Batch into gzipped NDJSON** per hour or per day. JSON compresses 5–10×
  (~2 GB/mo), and it turns 270,000 PUTs/month into 30–720.
- EC2 → same-region S3 transfer is free; API ingress is free.
- Lifecycle to Standard-IA after 30 days if it accumulates.

---

## Rejected alternatives

**Lambda** — no IP control at any price. Outside a VPC, egress IP is a
property of the AWS-managed NAT host, not the sandbox; concurrent invocations
share addresses, warm environments keep theirs for hours, and there's no API
to read or pin them. Forcing cold starts doesn't help — a new sandbox on the
same host reuses the same egress IP. Inside a VPC it's strictly worse: Lambda
uses Hyperplane ENIs shared across all concurrent executions (*fewer* IPs, not
more), gets no auto-assigned public IP, and needs a NAT Gateway that collapses
everything to one address.

**NAT Gateway with secondary IPs** — accepts up to 8 addresses, but the
feature exists for port exhaustion, not rotation: you cannot pin a flow to a
chosen IP. ~$62/mo for 8 uncontrollable, unattributable addresses.

**Fargate Spot, one task per request** — genuinely delivers a fresh public IP
per invocation (each task gets its own ENI), and at ~$43/mo it was the leading
candidate *until the rate limits were known*. Killed by the 6h tier: you
cannot track a 6-hour rolling budget against addresses you didn't choose and
won't see again, and a random draw can hand back an IP you burned earlier with
no way to detect it. Against a tier costing 30–60 minutes, that blind spot is
disqualifying. Fixed addresses let every request be accounted for exactly.

> Unverified assumption from that analysis: that the $0.005/hr IPv4 charge
> prorates per second alongside a task. If it instead rounds up to a full hour
> per task, per-request Fargate would be ~$1,460/mo rather than $43. Never
> confirmed — moot now, but don't reuse the $43 figure without testing it.

**IPv6** — would have been ideal: free on AWS (no per-address charge,
egress-only IGW has no hourly or data fee), and a VPC's default /56 provides
256 distinct /64s. Roughly $4/mo with effectively unlimited rotation.
**Not applicable — the target API is IPv4-only.** Worth re-checking if that
ever changes:
> ```powershell
> Resolve-DnsName api.example.com -Type AAAA
> ```

**Leaving AWS** — a single Hetzner CAX11 (~€3.79/mo) plus floating IPv4s
(~€1.19/mo each) lands around €28/mo for 20 addresses, roughly a third of
AWS's per-IP price. Out of scope, but AWS's $3.65/IP is at the expensive end
of the market, and the gap widens with IP count.

---

## Open questions

1. **Are the limits keyed per-IP or per-account?** Untested, and the whole
   design rests on it. Two endpoint classes raises the odds that account-scoped
   limits also exist on whatever is authenticated — those don't care how many
   IPs you have.
   **Test:** burn the fetch 16-per-12s tier from IP A (cheapest penalty at
   300s), then immediately call from IP B. Clean B confirms per-exact-IP.
   Cost: one t4g.nano, two EIPs, ~$1 for a day.

2. **Does the limiter bucket by prefix or ASN rather than exact address?**
   EIPs in one region often come from a small number of /24s — if it keys on
   /24, six addresses might be two buckets. All of AWS is essentially AS16509
   and every address is published in `ip-ranges.json`, so ASN-level bucketing
   or datacenter detection would defeat any AWS design at any price. That case
   needs diverse providers (Hetzner, OVH, Vultr are separate ASNs) or a
   residential proxy pool.
   **Test:** extend the above using EIPs from two different regions.

3. **Is 3,000/day work units or total API calls?** 4× difference in sizing.

4. **Are rate-limit state headers exposed?** Determines whether the scheduler
   can self-correct or must rely on local modeling alone.

5. **Confirm t4g ENI/IP limits** with `describe-instance-types` before sizing.

---

## Practical note

If the environment is vendor-hosted or a managed appliance, spreading across
IPs to stay under a per-IP limit may be something the terms address, and the
failure mode there tends to be account action rather than throttling — a
different risk profile than a config you control. Respecting the advertised
headers and backing off properly on 429 is both the correct engineering and
the thing that keeps this looking like a well-behaved client.

---

## Next steps

- [ ] Run the per-IP vs per-account test (~$1, one day)
- [ ] Confirm whether 3,000/day is work units or calls
- [ ] Verify t4g ENI limits and current pricing
- [ ] Terraform: VPC, public subnet, t4g.small, 6 EIP associations, S3 bucket,
      IAM role, SSM access
- [ ] Scheduler: dual per-IP ledgers, SQLite persistence, header
      reconciliation, batched S3 writes
