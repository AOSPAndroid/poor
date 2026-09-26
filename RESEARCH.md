# poor research

Public-source adapters run in the Site Worker. Each source has an independent persistent cache and last-good fallback. Source status, event dates, public dates and first observation dates are shown separately. No X/LLM inference contributes to buyer counts.

## Sources

- SEC: ticker → issuer CIK, 20 latest Form 4/4A filings within 180 days. Non-derivative transactions only. Code P acquisitions count; grants, exercise, withholding and amendments do not. A loaded amendment excludes that owner's transactions from automatic overlap calculations pending review. XML files remain linked as evidence.
- USAspending: up to 20 contracts and 20 grants with activity in the past year. Normalized recipient-name matches and keyword candidates are distinct. No subsidiary mapping or identity certainty is implied. Award obligations are not revenue and award start dates are not publication dates.
- Federal Register: latest 12 sector keyword matches within 90 days. These are research candidates, not established company impacts.
- Treasury: daily par yield curve, 3m/2y/10y/30y and five-observation changes in basis points.
- Congress.gov: optional `CONGRESS_API_KEY`; recent-bill title matching and committee referrals, not committee membership inference. Limited to 250 recently updated bills.
- Alpha Vantage: optional `ALPHA_VANTAGE_API_KEY`; one cached three-month earnings calendar daily, shared across all ticker queries. No assumed earnings date when absent or unavailable. The official MCP is https://mcp.alphavantage.co/; it is not configured without a key. Review public redistribution terms before enabling a licensed feed.

Runtime secrets are configured using Sites environment variables, never in public files. Adding a key requires a new deployment to apply it. Key-dependent feeds are currently unconnected.

## Connections and evaluation

Thirty-calendar-day transaction windows combine selected political households and SEC reporting owners. Two political households, or one household plus one SEC owner, qualify. Repeated transactions by the same household/owner do not add buyers. Each combination stores its exact source-document set and first observation date. Missing/stale source data pauses new combinations. This does not establish confidential information or causation.

Forward returns begin at the first available close strictly after the observation date and are evaluated after 5, 20 and 60 subsequent trading observations. SPY comparison requires identical entry/end dates. Returns exclude dividends, transaction costs and execution effects. Overlapping combinations are not independent samples. This is prospective tracking, not a historical backtest or claimed predictive success rate.

## Autonomous collection

`collect-research.py` refreshes the public feeds for BE, INTC, NVDA, AAPL, MSFT, AMZN, GOOG, TSLA, AVGO, LMT, RTX and PLTR, records source failures, and requests at most one Hermes investigation of a newly observed overlap per run. Research-only Hermes toolsets are web and x_search. The agent cannot access the ingest token; only the collector submits its bounded report. Agent summaries are labeled research leads and do not alter source evidence or buying counts.

The Windows task `poor Research Collector` runs every six hours and catches up after a missed run. It requires this PC to be awake and the user signed in. It does not require Codex or an open browser. The hosting platform does not supply an always-on scheduler for this project.

Private configuration: `%LOCALAPPDATA%/hermes/profiles/poor/poor-research-private.json` contains the Site URL and an ingest-only token. State: `poor-research-state.json` in the same profile. Neither is inside the Site archive. `/api/research/ingest` requires that token and accepts only collector status or bounded, source-linked research reports. The scheduler executes the profile's existing Python runtime. To disable: disable that named Windows task.

## Validation

`node verify.cjs`, `node verify-worker.mjs`, `node verify-terminal.mjs`, `node verify-research.mjs`, then `node build.cjs`. The research suite covers transaction classification, missing values, issuer matching, amendments, distinct buyers, time windows, return timing, recipient normalization, CSV parsing, missing yields, ingest authorization, and long/short position sizing. Real SEC, Treasury, Federal Register and USAspending responses were checked in local preview. Key-dependent APIs have not been verified with an account.
