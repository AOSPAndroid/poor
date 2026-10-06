# poor

**Politicians’ Operations & Outsized Returns.**

[Open poor](https://poor.daaalil.chatgpt.site/)

poor connects public political trading disclosures, market performance and source-backed research to help investigate stock swing trades. Follow who bought what, when they bought, when the purchase became public, and what happened next.

## Features

| Feature | What you can do |
| --- | --- |
| **Decision-focused Home** | Start with changes since the previous visit, up to three qualified research setups, and separate developing leads with missing-evidence labels. Cards connect public positioning to dated catalysts, confirmation, invalidation, price movement, sources, maps and watchlists. An empty qualified list stays empty. |
| **Latest political purchases** | Sorted by disclosure date across loaded households. Scan a compact feed with transaction dates, disclosure dates, reported amount ranges, ownership and links to filings. Compare stock price changes since purchase and since disclosure. |
| **Shared political buying** | Find multiple politician households buying the same ticker within a selected time window. Counts include available feed households beyond the featured profiles and count repeated household purchases only once. |
| **Politician profiles** | Search all loaded politicians and open a profile with short role titles, disclosed activity, track-record filters and presumed holdings. Portfolios distinguish purchases with no later disclosed sale from positions whose balance is unknown. |
| **Track-record ratings** | See the same score on map cards, profiles, watchlists and trade views. Tap to switch between one-year and three-year histories and inspect completed 20-session returns after disclosure, S&P 500 comparisons (SPY price proxy), sample size and the scoring formula. Limited evidence stays unrated. |
| **Trade timeline** | Scroll from newest to oldest purchases, sales and exercises on a vertical timeline with distinct colored markers, disclosure dates, amounts and available stock price changes. Open the politician’s research map directly from the profile. |
| **Expandable detective map** | Put a politician in the center, unfold their purchases and sales, inspect the latest buy/sell dates, open a stock to discover other traders, then explore those buyers’ activity. Inspect dates, amounts, price changes and original sources on one pannable, zoomable sheet. |
| **Stock research map** | Use the same labeled search controls, map-type buttons, zoom controls and rounded cards as the politician view, with the stock at the center. Connect political activity, corporate insider transactions, government awards, policy candidates, market context and research theses. Evidence and hypotheses are labeled separately. The central stock card includes a one-month mini chart, latest closing price, percentage change and price date, with green gains and red declines. |
| **Market terminal** | Explore stock and ETF charts with touch interaction, political purchase, sale and disclosure markers. Toggle buys, sales, disclosures, names/returns, SPY and activity details independently, or use Price only. |
| **Swing-trade context** | Monitor bond and credit ETF proxies, Treasury yields and market moves alongside stock research. Use available catalyst data and a position-sizing tool. |
| **poor’s research** | Read concise, cited theses linking multiple facts: why a stock matters now, what could confirm the thesis, what could invalidate it and the relevant trading horizon. Follow-up reviews can challenge earlier conclusions. |
| **Research performance** | Inspect hypothetical stock price changes after article publication, with available 5-, 20- and 60-session results, SPY comparisons and drawdown. Entry uses the first available daily close strictly after publication day. |
| **Watchlists and alerts** | Save stocks and configure in-app alerts for disclosures, buying clusters and daily closing-price thresholds. |
| **Command palette** | Press **Ctrl/Cmd + K** to find pages, company names, tickers, politicians and chart commands, including choosing the central politician for the map. Company suggestions include ticker and exchange, with cached lookups and local fallback. |
| **Connected navigation** | Keep the current stock and politician in a compact related-pages bar. Move between chart, map, trades, evidence, research, profiles and timelines without repeating a search. Transaction and map inspectors link directly to related pages. |
| **Phone and iPad layouts** | Use compact navigation, a More menu for account/import/export, larger touch controls and scrollable data tables. The chart appears higher on phones; tablet layouts retain more columns. |
| **Import and export** | Export transactions to CSV or load checked transactions locally. User imports are labeled and excluded from shared-buying signals. |

## Connecting the dots

Start with a disclosed purchase. Check who else bought the stock, whether the timing overlaps, how far the price has moved since disclosure and which sourced catalysts might matter next. Expand the map to investigate the people and companies behind those connections.

The research system combines structured feeds with bounded agent investigations. Calculations and buyer counts come from records and code; generated research remains a source-linked interpretation. Shared buying is a research lead, not evidence of private coordination or a proven probability of future gains.

## Data and refresh

- Political disclosures combine curated records with the available congressional feed and links to original filings. Coverage is incomplete, including some scanned filings.
- Market charts and return calculations use dated price histories. The interface exposes missing or stale data rather than inventing values.
- Research adapters cover SEC insider filings, USAspending awards, Federal Register policy candidates and Treasury yields. Congress.gov bill data and Alpha Vantage earnings calendars require server-side keys. Congress.gov is connected on the public deployment; earnings dates remain unavailable until an Alpha Vantage key is configured. Keys are never included in this repository.
- Home ranking, change detection, returns and market context use deterministic calculations, with no model calls. Research priority is not a win probability. Qualified cards require a recent sourced catalyst, a published thesis, current prices, sufficient estimated stock turnover and no adverse follow-up verdict. Option-related performance refers to the underlying stock.
- Daily research checks at most eight cached stock maps and sends up to four candidate connections to the existing bounded investigation. Older purchases rotate through the scan. An unchanged candidate fingerprint skips the daily model call; explicit refresh can override this. This is partial monitoring, not exhaustive market surveillance.
- Scheduled collection runs every six hours; daily research is scheduled once per day. The current scheduler requires the configured computer to be awake and its user signed in. Routine updates do not require an open coding session or browser.
- Alerts are delivered inside poor. Email and push delivery are not connected.

## Reading the numbers

Trade and disclosure returns are hypothetical **stock price changes**, not verified politician profits. Since-purchase comparisons use available historical stock closes. The latest-purchases feed’s since-disclosure return uses the first available close strictly after the disclosure date. This is a daily-close convention, not an actual execution price. Missing dates or prices produce an unavailable value. Options display the underlying stock’s change, not the option’s return.

Article scorecards use a separate, later entry convention: the first available close strictly after publication day. Calculations exclude dividends, fees, taxes and execution effects. Presumed holdings are inferred from loaded disclosures; quantities, current position values and undisclosed sales are unknown.

## Track-record score

The card score uses stock/ADR purchases from the past year; the evidence dialog also offers a separate past-three-years calculation, deduplicated by politician, ticker and purchase date. Entry is the first SPY closing session after disclosure; exit is 20 sessions later. Every closing price in the stock’s window must be present. Options, ETFs, sales, exercises and user imports are excluded.

Raw score = 60% × clamp(50 + 5 × median excess return in percentage points, 0, 100) + 40% × percentage of scored purchases beating SPY. The final value is pulled toward 50 using sample weight n / (n + 10). Rating requires at least 5 completed buys, 2 stocks, 3 purchase dates and 80% price coverage of mature windows. Strong starts at 65, Positive at 55, Mixed at 45, and Weak is below 45.

These are descriptive product thresholds, not a validated prediction or probability of profit. The detail panel shows evidence and coverage. Overlapping trades are not independent; incomplete disclosures can bias results. Ratings are computed automatically without model calls and do not change with display filters.

## Local development

Build the site and start the preview from the repository root:

```sh
node build.cjs
node dev-server.mjs
```

Open the local address printed by the preview server. Runtime credentials and private scheduler configuration must remain outside the public repository.

Relevant verification scripts include:

```sh
node verify.cjs
node verify-worker.mjs
node verify-terminal.mjs
node verify-research.mjs
node verify-connections.mjs
node verify-people-map.mjs
node verify-politicians.mjs
node verify-ratings.mjs
node verify-company-search.mjs
```

### Historical coverage

The automatic congressional feed now requests the full paginated history, capped at 5,000 rows per refresh, rather than only the last 365 days. Sources reports the loaded date range, rejected rows and whether more rows remain. This is partial provider coverage, not a complete archive. Price histories request five years and the terminal includes a 5Y range. No language-model calls are used for feed retrieval or return calculations.

A verified Pelosi backfill adds 19 stock, option, sale and exercise records from six House PTRs spanning November 2023–June 2025. Each links to its original report. Exercises stay distinct from fresh buys; option prices and returns are not inferred from their underlying shares. Historical disclosure dates use report signatures where original posting timestamps are unavailable, so copy-return estimates can be optimistic. The badge stays on one year; selecting three years never silently changes every politician’s score.

### Navigation and keyboard shortcuts

- The related-pages bar retains the current stock and selected politician across chart, map, trades, evidence, research, and profile views.
- `Ctrl/Cmd+K` searches stocks, companies, politicians, pages, and visible controls. `/` opens search; `?` opens the shortcut guide.
- Press `G`, then `H` (Home), `T` (Terminal), `D` (Trades), `P` (Politicians), `W` (Watchlist), `A` (Alerts), `M` (contextual map), `R` (Research), or `S` (Sources).
- `Ctrl+M` opens the contextual map. In the terminal, `W` watches/unwatches and `A` opens the alert form.
- In the terminal, `X` then `B/S/D/N/A/I/P` controls buys, sales, disclosures, names, activity, benchmark, or price-only mode.
- Letter shortcuts ignore typing fields, open dialogs, repeated keys, and input composition. `Esc` cancels a pending key sequence.
- Research reached from a stock is filtered to that ticker, with a visible **Show all research** control. Empty filtered results do not imply missing stock evidence.

Daily briefing: up to three concise, sourced news items on Home, refreshed by the existing 08:00 Europe/Paris local job while the PC is awake and signed in. News has a separate once-daily budget (210 seconds, ten agent turns, six requested retrievals), includes market implications and next checks, rejects X-only sources, and preserves prior editions on failures. Run python daily-news.py for the first daily attempt; repeated same-day invocations skip model work. Validation: node verify-news.mjs.

Home prioritizes a general-or-stock daily brief, supported research with a positively rated buyer, recent purchases and sales from Positive/Strong politicians, and a compact market row. Unassessed leads and price grids are folded under More tools. News categories distinguish new developments, general market news (7-day source window), and still-relevant catalysts/upcoming checks (21-day source window). Original dates remain visible.

Equity briefing: up to eight concise items with affected stock/equity-ETF tickers, what changed, equity implications, a specific main risk, next check and source links. New submissions require tickers and risk; older published briefs remain visible with missing-field labels. Daily discovery starts with two to three X searches covering @pelositracker, @insiderwave and @unusual_whales, then verifies material claims against non-X evidence. Up to twelve retrievals and a six-minute agent budget per daily attempt; repeated same-day invocations skip model work. X results without citations cannot establish facts. No disclosed sale is not proof of current ownership. The bundled free DDGS search provider requires `ddgs` in the Hermes Python environment. The news job ignores user configuration/rules and exposes only web/X toolsets; provider plugins must remain available for web retrieval.

Ask poor: signed-in account-scoped research chat, G then C / command palette, optional stock context and contextual stock links. A local scheduled chat-worker.py polls an authenticated queue once per minute with no inbound PC port. One pending question/account, 5/day/account and 30/day shared budget; one job per worker run, max 120-second model budget. Conversations expire from the queue during worker polling after seven days. The worker runs Hermes safe mode with explicit web/X toolsets, no private memories/rules/MCP/plugins, and supplies the curated SOUL explicitly. Credentials stay outside the repo. It must run while the PC is awake, online and signed in. Chat shows offline status. Verify with node verify-chat.mjs.

Ctrl/Cmd+P opens or minimizes the floating Ask poor panel from any app page; Expand opens the full tab. Drafts survive minimize/expand. New chat starts a separate conversation, and the account-scoped seven-day history allows reopening prior conversations; agent follow-up context is restricted to the selected conversation.


### Prediction markets

The Prediction markets tab (G then F, or command palette) reads Polymarket political events and Yes/No contracts. Public Gamma data is cached for two minutes. Seven-day Yes-price samples show how odds changed; date-only news comparisons are labelled and are not claims of causation. Related daily briefs are matched by shared specific terms and explicitly labelled topic matches, not proven causal links or forecasts. Ask poor opens a prefilled research question without submitting it or spending model tokens. Stock links open the terminal.

Real order books show Yes/No best ask, best bid, spread, timestamp and five depth levels per side. Empty, mismatched or stale books do not become usable quotes. Market links lead to Polymarket; poor does not submit orders. The simulated forecast journal and score routes are retired (HTTP 410); old stored records are preserved but unused.

Contract-specific poor assessments are separate from keyword-matched briefs. The scheduled investigation/challenge pipeline below replaces the earlier separate prediction-writing job. Each assessment connects sourced facts to exact settlement rules, gives the counterargument, pricing uncertainty and next check. Missing evidence is labelled unverified. Reports expire after three days or a resolution-rule change; failures preserve earlier records. The local PC must be awake and signed in. Authenticated ingest credentials stay outside the repository.

### Open-source integration notes

The [official Polymarket Python SDK](https://github.com/Polymarket/py-sdk) is MIT-licensed. Its Gamma sequence parsing and typed order-book models informed our independently implemented array validation, numeric normalization, outcome-token pairing and separation of public reads from authenticated trading. No SDK code is vendored. References: `src/polymarket/models/gamma/common.py` and `src/polymarket/models/clob/order_book.py`.

[Trafilatura](https://github.com/adbar/trafilatura) is now installed for bounded, cached public HTML extraction in the local research worker. Heavy research/backtesting frameworks are not needed for displaying actual contracts. Test with `node verify-predictions.mjs`.


### Research engine and swing decision desk

`research_engine.py` separates discovery from final synthesis for daily stock theses, equity news, prediction assessments and Ask poor. Discovery exposes only search/X tools (90-second model budget for daily jobs, 45 seconds for chat), with four searches requested and six agent turns maximum. Final synthesis has a separate 90-second budget, low reasoning and safe mode with an empty built-in toolset. Each subprocess has a wall-clock timeout and its own process tree is terminated on timeout. A failed discovery can still provide saved tool evidence to synthesis. Capacity errors are distinguished from missing evidence; there is no automatic unbounded retry.

Trafilatura extracts up to five public HTML pages per report (three for chat), capped at 2 MB fetched and 6,500 text characters each. Truncation and extracted dates are explicit. Successful pages cache for 24 hours; failed fetches for six hours. The existing Hermes secret-URL, SSRF and website-policy checks apply, including before cache reads and redirects. TLS verification stays enabled. This is an HTML extraction fallback, not an authenticated browser fallback; JavaScript-only pages may remain inaccessible. Search snippets are leads and cannot independently qualify as publication sources. Retrieved X citations require independent corroboration. Existing structured filings supplied to the task remain permitted evidence. No private memories, browser cookies, local file tools or trading tools are exposed to research calls.

NetworkX now builds a dated politician/stock graph for research selection. It prioritises distinct political households buying within inclusive 30-day windows across the previous 90 days, supplies other shared stocks as research leads, and excludes future/undated/imported records from the cluster calculation. Connections do not establish friendship, coordination, current holdings or predictive power. Candidate selection remains bounded; this does not scan every stock.

Home includes current sourced political-contract assessments with links to exact rules, prices and evidence. Supported stock cards add a factual price-confirmation check: close versus the prior 20-session closing high and average, relative volume, and matched S&P 500 proxy performance. Missing, future or stale price data suppress the check. These are research conditions, not entry instructions or profit probabilities. Prediction research prioritises contracts ending within 90 days with reported 24h volume and liquidity of at least $1,000 each. Current quotes still need checking before any user decision.

Install the additions into the existing Hermes environment with `pip install -r requirements-research.txt`. The existing local schedules use these files directly; PC availability is still required. Tests: `python verify-research-engine.py`, `python verify-research-candidates.py`, `node verify-decision-desk.mjs`, `node verify-news.mjs`, `node verify-predictions.mjs`, `node verify-chat.mjs`.

Live development validation: one run completed discovery of 18 leads, extraction of five pages and a final report, but returned zero publishable news items. Other calls encountered model capacity/timeouts. Do not interpret an empty brief as quiet markets or claim this release has demonstrated a profitable edge.

Prediction contract cards show both indicative outcome prices, a green Yes/red No proportional bar, 24-hour Yes-price movement, reported volume/liquidity, expiry and a seven-day Yes-price sparkline on a fixed 0–100% scale. The bar is labelled when prices do not sum to one dollar. Missing prices/history remain unavailable. Charts load for visible cards with three concurrent requests and ten-minute history caching; no model calls. Test: node verify-prediction-cards.mjs.

### Prospective research record

New daily theses include a primary ticker, long/watch classification, observable entry condition, catalyst and exit rule. Publication assigns a server timestamp and research-v1 measurement method. Legacy articles are never retroactively enrolled. New long USD equities/ETFs are measured at the first close strictly after publication, then 20 SPY sessions later, with 10 bps per side and a 25 bps sensitivity case. This fixed-window research measurement does not simulate the conditional entry rule or represent executed trades. Dividends, taxes and intraday stops are excluded.

Home and Research expose completed counts, winners/losers, net mean return, matched SPY excess return, closing drawdown and all registered states. Missing data never counts as a zero return. Completed observations are stored separately and frozen; invalidated theses stay in the record. Overlapping observations are not independent, and mean outcomes are not a portfolio return. The UI explicitly says the edge is not established; there is no automatic proven-profit badge. Current scorecard coverage is the first 200 registrations with any omitted count disclosed.

The six-hour collector refreshes registered symbols and the scorecard using APIs only. Browsers read a 15-minute cached scorecard; no AI call is made by viewing it. Existing local scheduling requirements remain. Real Polymarket books now show immediate spread friction, size at the best ask and pre-fee break-even probability, without invented forecasts, simulated positions or order submission. Verification: `node verify-edge.mjs` and `node verify-predictions.mjs`.

### Shared investigation/challenge pipeline

The existing daily and six-hour research schedules now enter `investigations.py`. It holds an OS process lock, persists budget reservations before model calls, and caps automated work at three investigations plus two challenges per Europe/Paris day. Errors consume a slot; restart and manual invocation cannot bypass the cap. Legacy prediction/review CLI entry points use the same coordinator. Chat remains separately user-triggered and bounded. The old collector overlap/fallback model calls no longer run alongside this queue.

Cheap monitoring fingerprints disclosures, later sales, map evidence and selected real contracts. A contract rule change, new evidence or a Yes-price move of at least five percentage points can trigger a new case; check timestamps alone do not. Unchanged successful cases are skipped, failed investigations can retry the next day, and a quiet queue includes a daily X/web equity-news scan. Coverage is bounded: candidate stocks, up to three opted-in favorites and three recent stock cases; up to six near-term liquid political contracts. It is not exhaustive market surveillance.

poor investigates; Athena independently retrieves evidence and challenges the case through its own profile. They share extracted-page caches, not private memories. A supported challenge requires an additional non-social source beyond the first brief. Exact rules and case fingerprints must match before a contract challenge is accepted. Same-model agreement is not independent proof. Short sourced findings (supported/wait/rejected/unverified), disagreement and older versions appear on Home and Research. Contract findings appear beside current odds. Qualifying stock theses feed the existing publication/performance system; qualifying news goes into the daily brief. Source, formatting or access failures remain visible and do not become fabricated articles.

Bookmark prioritization is an explicit account opt-in on Watchlist. Only opted-in stock/ETF symbols are supplied to the researcher, without identity, via a token-protected endpoint. Guests cannot opt in, and unchecking removes their symbols. Existing scheduled tasks still require this PC awake/online/signed in. Tests: `verify-investigations.py`, `verify-investigations.mjs`, `verify-research-engine.py`, `verify-edge.mjs`, `verify-predictions.mjs`.

### Agent research playbooks and decision checks

Every investigation/review loads `agent-guides/RESEARCH.md`, its role guide (`INVESTIGATOR.md` or `CHALLENGER.md`) and the relevant `STOCKS.md` or `CONTRACTS.md`. These are versioned working instructions, injected into the prompts even though the CLI ignores generic profile rules. Edit them here; do not overwrite personal agent memories or soul files. Missing guides fail closed. They require primary evidence, causal links, counterarguments, exact contract rules and honest uncertainty. Shared-model agreement is not evidence of profitability.

Source selection prioritizes original supplied documents and government sources ahead of encyclopedias. Bounded extraction supports public HTML, text-based PDF, JSON, CSV, XML and plain text, retaining retrieval times and truncation flags. PDF parsing runs in a separate ten-second process with a twenty-page/text limit; downloads are limited to 2 MB. Scanned and JavaScript-only sources can still be unavailable; there is no OCR. Both investigator and challenger must actually retrieve publication sources; supplied URLs alone are no longer enough. Decisive citations must also be retrieved documents, excluding X, Wikipedia and Polymarket itself. These checks establish provenance, not automatic factual verification or primary-source status for every other domain.

The three-slot queue reserves space for one stock, one contract and one daily briefing when each is eligible; remaining slots fill from other candidates. Contract selection uses resolution-source availability, non-extreme odds and liquidity, with existing cases prioritised. This is a research allocation heuristic, not an expected-return ranking. A recorded catalyst date schedules one follow-up even if the PC misses the exact day. For new cases with structured price levels, the cheap monitor also compares completed-close entry/stop/target states and queues a follow-up when a boundary changes. These are daily-close observations, not real-time alerts. The existing three/two daily caps still apply.

Selected stocks receive current completed-close context, 20-session range/return, matched SPY excess return and average dollar turnover. Before a supported verdict, deterministic screens require retrieved decisive evidence, a catalyst within 90 calendar days, fresh USD equity/ETF history, $1m average daily dollar turnover and justified entry/stop/target levels. The entry condition must be met at the last close, the stop/target not already crossed, and scenario reward/risk at least 2:1 after assumed 10 bps costs per side using the worse of proposed entry and close. These configurable-in-code thresholds are research heuristics, not a validated profitable strategy. They do not represent fills, guaranteed stops or intraday monitoring.

Selected real contracts receive fresh Yes/No bid/ask context. A supported model response must supply retrieved decisive documents, a verified rule interpretation and a reproducible probability interval. Code computes lower-bound probability minus ask only as a pre-fee scenario margin. Because the current quote endpoint does not supply verified fees and no probability calibration has been established, these cases remain Wait rather than claim a net edge. Missing inputs never become invented prices/probabilities. The public brief shows entry conditions and any blocking checks; the full assessment and retrieval diagnostics remain in the local case history.

Tests: `python verify-decision-checks.py`, plus the investigation and research-engine tests above. No wallets, trades or simulated Polymarket positions are introduced. No profitable edge has been demonstrated.

### Public research quality gate

Home includes an independently scrolling political-purchase ribbon below stock favorites. It selects up to twenty purchases disclosed in the past ninety days from politicians with a current Positive/Strong after-disclosure rating (55+), ordered by disclosure date. Items show name, ticker, reported amount bracket, asset type, owner when known, disclosure date/relative age and score. Names open profiles and tickers open the terminal. Sales, imports, future records and duplicate disclosure rows are excluded. Pause preferences are saved; hover, keyboard focus and touch temporarily stop motion, and reduced-motion settings are respected. An empty qualifying set is labelled rather than filled with unrated purchases.

Followed politicians are persisted in the same private account workspace as stock bookmarks. Signed-in users restore follows across browsers/devices; guests use their durable browser-session workspace. Existing browser-only `cl-follows` are imported once into an uninitialized follow list. Initialized empty lists remain empty, so a stale device cannot resurrect an unfollow. Browser caches are identity-scoped; previous signed-in account follows are not imported into a different account. Workspace operations are serialized instead of discarded while busy. Failed saves keep the previous UI state and show a retry message. Tests: `node verify-follows.mjs` and `node verify-terminal.mjs`.

Primary navigation follows the research workflow: Home, Research, Terminal, Polymarket and Watchlist. More groups politicians, disclosures, the map, alerts, Ask poor, sources and account/import/export controls. Existing keyboard shortcuts remain available. Home retains favorites first, shows stock/contract research beside up to three visible briefing items on desktop/tablet (stacked on mobile), and keeps additional news expandable. Unchanged visit banners are hidden; research performance and methodology are collapsed below current market information.

Investigation cards require an explicit decisive-document retrieval flag from the worker; URLs alone are insufficient. Unverified attempts remain in the stored activity/case history and retry queue, not the main Home/Research/contract cards. New general news publication uses the same retrieval gate. This is a provenance screen, not proof that claims are correct. Existing published daily articles keep their separate validation and history.

Home shows only supported findings from the last three days; stock/contract findings also require a supported independent review. A supported general briefing may appear without a second review. With no qualifying findings, that Home section is hidden so the regular market news and tools retain the space. Research allows sourced wait/rejected findings and preserves older/superseded sourced cases in collapsed history. The latest attempt always wins per target: an unsuccessful follow-up never silently revives an older optimistic thesis. Tests: `node verify-research-feed.mjs`.

### Research accountability

Home and Sources expose loaded disclosure coverage, source-link/date completeness and freshness. Coverage is explicitly partial: no claim is made that every political filing or holding has been collected.

Research now includes an archive of all immutable investigation objects, including unverified attempts, waits, rejections and each challenge. Pagination reads the durable object store rather than the 150-item activity cache. New evidence-backed stock findings originally marked supported register at the server's publication time. The fixed 20-session outcome uses the first close after that UTC date, 10 bps per side, a 25 bps stress scenario, matched-date SPY price returns and daily-close drawdown. Completed outcomes are frozen, including losses. The investigation summary explicitly covers the recent activity window; the archive exposes older records. It is separate from the existing article scorecard; do not pool the two as independent signals. Entry triggers are not execution simulations and these are not account profits.

New contract investigations preserve the actual provider quote, bid/ask/spread when available, exact resolution wording and quote timestamp. Readers can compare current odds with the original snapshot. Missing quotes remain missing; odds changes are not profits and no paper positions are created. Legacy findings are not retroactively registered with invented publication quotes.

Homepage stock/contract promotion requires evidence-backed findings and an evidence-backed supported challenge. Investigator and challenger guides require dated catalysts, testable conditions and opposing evidence. Politician directory returns now include an explicit 10 bps cost assumption per side; underlying-price columns elsewhere retain their labelled gross-return methodology. The scheduled collector refreshes the investigation outcome cache without model calls.

### Politician overview and follow alerts
Profiles now show loaded disclosure dates, average reporting delay, typical gap between disclosure dates, and a latest-disclosure change summary. Purchase-vs-disclosure charts use the same paired stock/ADR/ETF observations at 5/20/60 benchmark sessions, with matched SPY windows and 10 bps cost assumptions per side; options and missing/stale histories are excluded. This is historical analysis, not a portfolio simulation.

Holdings support owner and instrument/status filters. Original transaction amount ranges remain visible, while sales retain an unknown remaining balance. Sector exposure shows classified ticker counts, not invented value weights. Related research matches current disclosed exposure to recent evidence-backed investigations, with source links, risks, next checks and reviewer disagreements; missing research remains explicit.

Following a politician enables server-persisted in-app filing alerts. The first valid feed establishes a silent baseline; later newly observed rows describe first/repeat purchases, sales, reported amounts and nearby distinct-household buying. These are observations from partial feeds, not guaranteed new publications or proof of coordination. Alerts are evaluated on workspace refresh, not delivered by email/push or a new cloud scheduler.


### Catalyst monitoring and research health
Official DOE, Treasury and Commerce announcements are matched to all identifiable issuers in loaded political disclosures, including older purchases. Agency access failures remain visible. Recent news rotates through 96 stocks per run; leads are retained for seven days. Publication still requires retrieved evidence. The local catalyst job runs hourly 14:00-22:00 Paris, sharing limits of 12 investigations and 8 reviews per day with existing jobs. Contract investigations are capped at two daily; Musk post-count markets are excluded. Two unverified attempts with unchanged evidence trigger a seven-day cooldown; material changes bypass it. Athena can independently rescue a fresh-catalyst stock investigation once. Research health distinguishes useful verification from process completion, with degraded runs returning exit code 2. Local scheduling requires the computer on and user signed in.

Grok 4.7 remains preferred. Empty responses, capacity errors or timeouts trigger one Grok 4.6 retry, with a 30-minute per-profile cooldown before testing 4.7 again. Both model failures remain unverified, never interpreted as lack of opportunities.
