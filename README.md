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

Your categories live in the labels file. A new file starts with these:

| Kind | Categories | Counts as |
|---|---|---|
| Spending | Transport, Food, Shopping, Bills, Subscriptions, Family, General Spending | money out is spent; money in is a refund (subcategory *Refund*) |
| People | People (subcategory = the person) | same as Spending |
| Income | PhD (`UNIV OF MANCHESTER`), UMSU (`MAN UNI STUDENTS U BGC`) | money in is income |
| Transfers | Transfer | Transfers section, not counted |
| Savings & investments | Savings, Investment | *Saved & invested* card, not counted |

- **Edit window** (click a category chip): pick a category or make a new one, pick a subcategory or make a new one,
  add a note and tags. Badges end in an arrow: ↙ money in, ↗ money out.
- **Merchants**: with *Remember for this merchant* on, the edit window saves "description contains X → category".
  Other months and new statements get it too. First match wins. The two income sources above are merchants too;
  add another income source by making an Income category and remembering its payer.
- **One-off edits** set one transaction's category. They beat merchants.
- **Settings** lists categories (rename, colour, kind, delete), accounts, merchants and one-off edits.

## Accounts and transfers

Accounts in the data appear by themselves. Add others in settings (e.g. a savings account without statements yet).
Name them the way myFinances will, so their statements link up later.

The other side of a transfer is found from, in order:
1. the account you picked by hand (*Sent to* / *Came from* in the Transfers section or the edit window);
2. the same amount in another account within 4 days;
3. an account whose **match text** is in the description (e.g. a sort code);
4. where similar transfers usually go;
5. otherwise *Unknown account*.

## Where your data lives

| What | Where |
|---|---|
| Transactions | monthly CSVs from myFinances (`Finance/combined/<year>/<year>-<month>.csv`); other CSVs there are ignored |
| Your categories, accounts, merchants and labels | `Finance/labels.json` in the vault (setting: *Labels file*) |
| Plugin settings | `data.json` in the plugin folder |

Labels are saved against the `id` column that myFinances writes (a hash of account, date, amount and description).
Moving files or changing categories doesn't change ids, so the labels file can be copied to another vault.
A labels file from another version isn't loaded or overwritten: rename or delete it to start fresh.

## How totals work

- Only rows in the chosen currency (default GBP) count.
- Transfers and Savings & investments are left out.
- Money out is **spending**.
- Money in is **income** only under an Income category.
- Money in under Spending or People is a **refund** and reduces spending.
- Uncategorised money in isn't counted.

All of this is in `src/models/rowKind.ts`.

## Layout

```
src/
  main.ts            wiring only
  models/            data types + pure calculations (no DOM)
  data/              reading CSVs and the labels file from the vault
  defaults/          default categories and settings
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
| Money in | `moneyInList.ts` | every payment in this month (not transfers), how it counts, category chips |
| By category | `categoryTable.ts` | table, share bars, click-to-expand transactions with category chips |
| By account | `accountTable.ts` | table with share bars |
| Transfers | `transfersTable.ts` | account → account per month, cells tinted by size, expand to move a transfer |
| Compared with last month | `comparison.ts` | bars from a centre line, vs 3-month average |
| Uncategorised | `uncategorisedList.ts` | pick a category for each description; remembered for that merchant |

Hide any section in settings. Shared pieces live next to them: `tableHead`, `shareBar`, `expandable`, `showMore`, `chartFrame`, `svgAxes`.
