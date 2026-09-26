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

## Lessons

Each unfinished section shows a dashed box with its data. Build them in order:

1. `accountTable.ts` – a table
2. `categoryTable.ts` – table with click-to-expand rows
3. `uncategorisedList.ts` – a list
4. `comparison.ts` – table with + / − changes
5. `monthlyBars.ts` – bar chart with divs
6. `dailyLine.ts` – line chart with SVG

`summaryCards.ts` is the worked example to copy from.
