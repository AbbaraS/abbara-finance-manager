# Abbara Finance Manager

Obsidian dashboard for the finance database in [myFinances](../../myFinances). Python works out every transaction;
here you see them and edit your lists and decisions, and the rules run again after each save.
Idea inspired by [LBerts/personal-finance](https://github.com/LBerts/personal-finance); code written from scratch.

## Setup

```bash
# 1. Make the database (once, then after each new statement)
cd ~/source/myFinances && make

# 2. Link the plugin into the vault (once)
ln -s ~/source/obsidian-plugins/abbara-finance-manager "<vault>/.obsidian/plugins/abbara-finance-manager"

# 3. Build
npm install
npm run dev     # rebuilds on save
```

Enable **Finance Manager** in Community plugins, set **Database file** in its settings
(e.g. `~/source/myFinances/data/finance.db`), then click the wallet icon.
Run `make` in myFinances and the dashboard reloads (or press the reload button).
Desktop only: it reads the database with the `sqlite3` program that comes with macOS, and after each save runs
`myFinances/.venv/bin/python -m finances.build --rules` (the database must be `<myFinances>/data/finance.db`).

## Categories

Your categories live in the database (a new one gets its first lists from myFinances' `data/seed.sql`):
Essential, Transport, Shopping, Lifestyle (spending), People, Income, Transfer, Savings and Investment, each with a few
subcategories. Money out under Spending is spent; money in there is a refund (subcategory *Refund*).

- **Recipients** (called counterparties in the UI): who a transaction is with, found by text in the description
  (patterns). Python decides each row: your one-off edit > a person's pattern > an account's > a subscription >
  a recipient's pattern; the longest text wins.
- **Edit window** (click a category chip): category, person (People only), subcategory, recipient, subscription,
  note, tags and debt. With *Remember* on, the text is saved as a pattern on the recipient (or person), so other
  months and new statements get it too. Otherwise it's a one-off edit for that transaction.
- After you save, the rules run again in Python (about two seconds) and the dashboard redraws.
- **Settings** lists categories with their subcategories, people, subscriptions, accounts, recipients and one-off edits.

## Subscriptions

A subscription is a named regular payment, e.g. *iCloud+*: its recipient's payments (or its own text), at its price,
one per period. Python follows the payments (`build.follow_schedule`), so a billing day that moves keeps matching.

- Wrong one? Pick another (or *Not a subscription*) in the edit window; that's kept for that payment.
- **Number of payments** makes it "out of x": NHS PPC, 10 × £11.45, shows *5/10* and "£57.25 of £114.50".
- **Status**: *Cancelled* keeps its last payment's date; it isn't matched after that.
- The Subscriptions section shows each one's price, payments, this month, total spent, last and next payment,
  roughly what the running ones cost a month, and spending that repeats like a subscription but has no name yet (*Name it*).

## Accounts and transfers

Accounts come from the database, in your order (settings, or drag the cards in *Transfer links*), each with a colour,
an icon and **patterns**: text that means a transaction went to or came from it (e.g. a sort code).
Add accounts without statements in settings, so transfers to them have a home.

Transfers are paired by Python (`build.link_transfers`): a row whose pattern points at another account, with the
opposite amount there within 4 days; between currencies (Revolut GBP ↔ EUR) the same or next day at a sensible rate.
In *Transfer links* you can unlink a wrong pair, link a row to its other side, or say it has none
(a one-sided transfer to an account, e.g. one without statements). Your links are kept by `make`.

## Where your data lives

Everything is in one SQLite file, `myFinances/data/finance.db` (setting: *Database file*); the tables are in
`myFinances/src/finances/schema.sql`. Plugin settings (section order, collapsed sections) are in `data.json`.

| Tables | Written by | Holds |
|---|---|---|
| `Account`, `Trans` | myFinances (`make`) | statements; accounts' name, colour, icon and order are edited here |
| `Category`, `Person`, `Recipient`, `Pattern`, `Subscription`, `Tag`, `AutoTag` | plugin (settings, edit window) | your lists |
| `Override`, `Note`, `TransactionTag`, `Debt` | plugin (edit window) | your decisions on single transactions |
| `Result`, `Transfer`, `Refund`, `SubscriptionPayment` | myFinances (rules) | where each row ended up, pairs and payments; links you make or undo are kept |

`src/data/tables.ts` reads all of it into your lists and finished rows, and writes your lists and decisions back
(rows keep their ids). Every row is saved against the transaction `id` myFinances makes, so `make` never loses them.
SQLite's file locking lets Python and the plugin both write. A database from another version isn't loaded or written to
(`DB_VERSION` in `src/data/Database.ts`, the same as myFinances' `db.VERSION`).

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
  data/              Database.ts (load, save, run the rules), tables.ts (tables <-> your lists), sqlite.ts (runs sqlite3)
  defaults/          default settings, empty lists
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
| By category | `categoryTable.ts` | table, share bars; expand a category into subcategories (People: people, then theirs), each with its total, then transactions |
| Subscriptions | `subscriptionTable.ts` | up to the shown month or overall; price, paid (5/10), this month, total, status; payments per subscription |
| By account | `accountTable.ts` | table with share bars |
| Transfers | `transfersTable.ts` | account → account per month, cells tinted by size, expand to move a transfer |
| Transfer links | `transferLinks.ts` | a card per account (in, out, left; what came in), drag to reorder; unlink, link, one-sided |
| Compared with last month | `comparison.ts` | bars from a centre line, vs 3-month average |
| Uncategorised | `uncategorisedList.ts` | pick a category for each description; remembered for that merchant |

Hide any section in settings. Shared pieces live next to them: `tableHead`, `shareBar`, `expandable`, `showMore`, `chartFrame`, `svgAxes`.
