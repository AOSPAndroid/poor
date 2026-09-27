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
