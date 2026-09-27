# poor

**Politicians’ Operations & Outsized Returns.**

[Open poor](https://poor.daaalil.chatgpt.site/)

poor connects public political trading disclosures, market performance and source-backed research to help investigate stock swing trades. Follow who bought what, when they bought, when the purchase became public, and what happened next.

## Features

| Feature | What you can do |
| --- | --- |
| **Latest political purchases** | Scan a compact feed with transaction dates, disclosure dates, reported amount ranges, ownership and links to filings. Compare stock price changes since purchase and since disclosure. |
| **Shared political buying** | Find multiple politician households buying the same ticker within a selected time window. Counts include available feed households beyond the featured profiles and count repeated household purchases only once. |
| **Politician profiles** | Search all loaded politicians and open a profile with short role titles, disclosed activity, track-record filters and presumed holdings. Portfolios distinguish purchases with no later disclosed sale from positions whose balance is unknown. |
| **Track-record ratings** | See the same score on map cards, profiles, watchlists and trade views. Tap to inspect completed 20-session returns after disclosure, SPY comparisons, sample size and the scoring formula. Limited evidence stays unrated. |
| **Trade timeline** | Scroll from newest to oldest purchases, sales and exercises on a vertical timeline with distinct colored markers, disclosure dates, amounts and available stock price changes. Open the politician’s research map directly from the profile. |
| **Expandable detective map** | Put a politician in the center, unfold their purchases and sales, inspect the latest buy/sell dates, open a stock to discover other traders, then explore those buyers’ activity. Inspect dates, amounts, price changes and original sources on one pannable, zoomable sheet. |
| **Stock research map** | Connect political activity, corporate insider transactions, government awards, policy candidates, market context and research theses. Evidence and hypotheses are labeled separately. |
| **Market terminal** | Explore stock and ETF charts with touch interaction, political purchase, sale and disclosure markers. Toggle buys, sales, disclosures, names/returns, SPY and activity details independently, or use Price only. |
| **Swing-trade context** | Monitor bond and credit ETF proxies, Treasury yields and market moves alongside stock research. Use available catalyst data and a position-sizing tool. |
| **poor’s research** | Read concise, cited theses linking multiple facts: why a stock matters now, what could confirm the thesis, what could invalidate it and the relevant trading horizon. Follow-up reviews can challenge earlier conclusions. |
| **Research performance** | Inspect hypothetical stock price changes after article publication, with available 5-, 20- and 60-session results, SPY comparisons and drawdown. Entry uses the first available daily close strictly after publication day. |
| **Watchlists and alerts** | Save stocks and configure in-app alerts for disclosures, buying clusters and daily closing-price thresholds. |
| **Command palette** | Press **Ctrl/Cmd + K** to find pages, tickers, politicians and chart commands, including choosing the central politician for the map. |
| **Import and export** | Export transactions to CSV or load checked transactions locally. User imports are labeled and excluded from shared-buying signals. |

## Connecting the dots

Start with a disclosed purchase. Check who else bought the stock, whether the timing overlaps, how far the price has moved since disclosure and which sourced catalysts might matter next. Expand the map to investigate the people and companies behind those connections.

The research system combines structured feeds with bounded agent investigations. Calculations and buyer counts come from records and code; generated research remains a source-linked interpretation. Shared buying is a research lead, not evidence of private coordination or a proven probability of future gains.

## Data and refresh

- Political disclosures combine curated records with the available congressional feed and links to original filings. Coverage is incomplete, including some scanned filings.
- Market charts and return calculations use dated price histories. The interface exposes missing or stale data rather than inventing values.
- Research adapters cover SEC insider filings, USAspending awards, Federal Register policy candidates and Treasury yields. Congress.gov bill data and Alpha Vantage earnings calendars require optional keys and are currently unconnected.
- Scheduled collection runs every six hours; daily research is scheduled once per day. The current scheduler requires the configured computer to be awake and its user signed in. Routine updates do not require an open coding session or browser.
- Alerts are delivered inside poor. Email and push delivery are not connected.

## Reading the numbers

Trade and disclosure returns are hypothetical **stock price changes**, not verified politician profits. They use the relevant day’s available close; the disclosure-day close does not establish that the filing was public before that close. Missing dates or prices produce an unavailable value. Options display the underlying stock’s change, not the option’s return.

Article scorecards use a separate, later entry convention: the first available close strictly after publication day. Calculations exclude dividends, fees, taxes and execution effects. Presumed holdings are inferred from loaded disclosures; quantities, current position values and undisclosed sales are unknown.

## Track-record score

The score uses stock/ADR purchases from the past year, deduplicated by politician, ticker and purchase date. Entry is the first SPY closing session after disclosure; exit is 20 sessions later. Every closing price in the stock’s window must be present. Options, ETFs, sales, exercises and user imports are excluded.

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
```
