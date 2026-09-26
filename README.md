# Abbara Finance Manager

Obsidian dashboard for the monthly CSVs made by [myFinances](../../myFinances).
Idea inspired by [LBerts/personal-finance](https://github.com/LBerts/personal-finance); code written from scratch.

## Setup

```bash
# 1. Link the data into your vault (once)
mkdir -p "<vault>/Finance"
ln -s ~/source/myFinances/data/combined "<vault>/Finance/combined"

# 2. Link the plugin into the vault (once)
ln -s ~/source/obsidian-plugins/abbara-finance-manager "<vault>/.obsidian/plugins/abbara-finance-manager"

# 3. Build
npm install
npm run dev     # rebuilds on save
```

Enable **Finance Manager** in Community plugins, then click the wallet icon.
Run `make` in myFinances and the dashboard reloads (or press the reload button).

## How totals work

- Only rows in the chosen currency (default GBP) count.
- Transfers (`is_transfer`) and ignored categories (default `Investment`) are left out.
- Money out is **spending**.
- Money in is **income** if its category is an income category or `Uncategorised`.
- Money in under any other category (e.g. a Shopping refund) is a **refund** and reduces spending.

All of this is in `src/models/rowKind.ts`.

## Layout

```
src/
  main.ts            wiring only
  models/            data types + pure calculations (no DOM)
  data/              reading CSVs from the vault
  views/             DashboardView + one file per section
  settings/          settings tab + sections/
  utils/             dates, money
styles.css
```

## Dashboard sections

| Section | File | Technique |
|---|---|---|
| Summary cards | `summaryCards.ts` | cards from `monthSummary` |
| Monthly overview | `monthlyBars.ts` | div bar chart, round axis steps, tooltips, click a month |
| Running net | `dailyLine.ts` | hand-drawn SVG line, crosshair on hover / arrow keys |
| By category | `categoryTable.ts` | table, share bars, click-to-expand transactions |
| By account | `accountTable.ts` | table with share bars |
| Compared with last month | `comparison.ts` | bars from a centre line, vs 3-month average |
| Uncategorised | `uncategorisedList.ts` | copy a ready-made rule for `category_patterns.csv` |

Shared pieces live next to them: `tableHead`, `shareBar`, `expandable`, `showMore`, `chartFrame`, `svgAxes`.
