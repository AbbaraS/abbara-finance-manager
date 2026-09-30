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

The categories are fixed, in `src/defaults/categories.ts`:

| Group | Categories | Counts as |
|---|---|---|
| Spending | Transport, Food, Shopping, Bills, Subscriptions, Family, General Spending | money out is spent, money in is a refund |
| Income | PhD, GTA, UMSU, Other | money in is income |
| Not counted | Transfer, Investment | Transfers section / Invested card |

- **Subcategories** are free text under a category (e.g. *Food › Groceries*). The edit window suggests ones you've used.
- **Merchants**: with *Remember for this merchant* on, the edit window saves "description contains X → category".
  Other months and new statements then get it too. First match wins; the list is in settings (collapsed, searchable).
- **One-off edits** set one transaction's category. They beat merchants.
- On the dashboard, click a category chip (or the tag button in *Uncategorised*) to change it.

Transfers: the other account is found by matching the same amount in another account within 4 days.
If that side isn't in your data, the account that similar transfers usually go to is used.
You can also set it by hand ("Sent to" / "Came from" when editing a transfer).

## Where your data lives

| What | Where |
|---|---|
| Transactions | monthly CSVs from myFinances (`Finance/combined/<year>/<year>-<month>.csv`); other CSVs there are ignored |
| Your labels: one-off categories, subcategories, notes, merchants | `Finance/labels.json` in the vault (setting: *Labels file*) |
| Plugin settings | `data.json` in the plugin folder |

Each transaction has a short id: a hash of its date, account, amount and description (plus `#n` for identical rows).
So labels survive re-running `make` and adding older statements.

Upgrading from settings v2 moves categories, rules and edits out of `data.json` into the labels file once,
and keeps the old file as `data-v2-backup.json` (see `src/models/migrateToLabels.ts`).

## How totals work

- Only rows in the chosen currency (default GBP) count.
- Rows in *Transfer* or *Investment* are left out.
- Money out is **spending**.
- Money in under an *Income* category is **income**. Uncategorised money in is income only on an income account
  (default `barclays - debit`).
- Money in under a *Spending* category is a **refund** and reduces spending.
- Money in anywhere else isn't counted.

All of this is in `src/models/rowKind.ts`.

## Layout

```
src/
  main.ts            wiring only
  models/            data types + pure calculations (no DOM)
  data/              reading CSVs and the labels file from the vault
  defaults/          fixed categories, default settings
  views/             DashboardView + one file per section
  edit/              edit-transaction window
  views/look/        badges, icon dots, colours
  settings/          settings tab + sections/
  utils/             dates, money
styles.css
```

## Dashboard sections

| Section | File | Technique |
|---|---|---|
| Summary cards | `summaryCards.ts` | income, spending, net, invested (all time) |
| Monthly overview | `monthlyBars.ts` | div bar chart, round axis steps, tooltips, click a month |
| Running net | `dailyLine.ts` | hand-drawn SVG line, crosshair on hover / arrow keys |
| Money in | `moneyInList.ts` | every payment into the income accounts, with category chips |
| By category | `categoryTable.ts` | table, share bars, click-to-expand transactions with category chips |
| By account | `accountTable.ts` | table with share bars |
| Transfers | `transfersTable.ts` | account → account per month, cells tinted by size, expand to fix |
| Compared with last month | `comparison.ts` | bars from a centre line, vs 3-month average |
| Uncategorised | `uncategorisedList.ts` | pick a category for each description; remembered for that merchant |

Hide any section in settings. Shared pieces live next to them: `tableHead`, `shareBar`, `expandable`, `showMore`, `chartFrame`, `svgAxes`.
