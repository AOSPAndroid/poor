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

Signed-in users can lock up to 40 private, server-timestamped $100 paper forecasts. Entry and open-exit estimates walk the available order-book depth; incomplete or stale books reject entries. Probability, evidence, invalidation, resolution rules and user-chosen cost allowance are preserved. Entries cannot be edited or removed through the app, and one forecast per market prevents duplicate counting. This places no real orders and needs no Polymarket credentials.

Result checks run while the tab is open. Confirmed resolved 0/1 outcomes settle paper positions; merely closed/proposed/disputed markets do not. Open marks use bids and the recorded cost allowance; settled payouts exclude exit fees. P/L and Brier calibration cover checked records only; stale or missing results remain visible. A changed rule text is flagged. Cost allowances are estimates, not verified platform fee schedules. Local provider certificate/access failures are surfaced without bypasses or fabricated data. Tests: `node verify-predictions.mjs`.
