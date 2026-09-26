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

## Categories

Categories live in the plugin, not in myFinances. Everything is in **Settings → Abbara Finance Manager**.

- **Categories** each have a kind:
  - *Spending*: money out is spent, money in is a refund.
  - *Income*: money in counts as income.
  - *Not counted*: left out of totals (transfers, savings, family money).
- **Rules** put transactions in a category when the description contains some text.
  They can be limited to one account or to money in / out. Checked top to bottom; first match wins.
- **One-off edits** set one transaction's category. They beat rules.
- On the dashboard, click a category chip (or the tag button in *Uncategorised*) to change it.
  Turn on *Apply to similar transactions* to save a rule instead of a one-off edit.

Transactions are matched by a key made from date, account, amount and description,
so edits survive re-running `make`.

## How totals work

- Only rows in the chosen currency (default GBP) count.
- Rows in a *Not counted* category are left out.
- Money out is **spending**.
- Money in is **income** only on an income account (default `barclays - debit`),
  when its category is *Income* or it has no category yet.
- Money in under a *Spending* category is a **refund** and reduces spending.
- Money in anywhere else isn't counted.

All of this is in `src/models/rowKind.ts`.

## Layout

```
src/
  main.ts            wiring only
  models/            data types + pure calculations (no DOM)
  data/              reading CSVs from the vault
  views/             DashboardView + one file per section
  edit/              change-category window
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
| Money in | `moneyInList.ts` | every payment into the income accounts, with category chips |
| By category | `categoryTable.ts` | table, share bars, click-to-expand transactions with category chips |
| By account | `accountTable.ts` | table with share bars |
| Compared with last month | `comparison.ts` | bars from a centre line, vs 3-month average |
| Uncategorised | `uncategorisedList.ts` | pick a category and save a rule for each description |

Hide any section in settings. Shared pieces live next to them: `tableHead`, `shareBar`, `expandable`, `showMore`, `chartFrame`, `svgAxes`.
