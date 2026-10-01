# Abbara Finance Manager

Obsidian dashboard for the finance database made by [myFinances](../../myFinances).
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
Desktop only: it reads the database with the `sqlite3` program that comes with macOS.

## Categories

Your categories live in the database. A new database starts with these:

| Kind | Categories | Counts as |
|---|---|---|
| Spending | Transport, Food, Shopping, Bills, Subscriptions, Family, General Spending | money out is spent; money in is a refund (subcategory *Refund*) |
| People | People (each person has their own subcategories, e.g. Mum › Allowance) | same as Spending |
| Income | PhD (`UNIV OF MANCHESTER`), UMSU (`MAN UNI STUDENTS U BGC`) | money in is income |
| Transfers | Transfer | Transfers section, not counted |
| Savings & investments | Savings, Investment | *Saved & invested* card, not counted |

- **Subcategories** belong to one category; under People, to one person. Add, rename and delete them in settings
  (Categories, People) or make one in the edit window.
- **Edit window** (click a category chip): pick a category, person (People only) and subcategory, or make new ones;
  pick the subscription; add a note and tags. Badges end in an arrow: ↙ money in, ↗ money out.
- **Merchants**: with *Remember for this merchant* on, the edit window saves "description contains X → category".
  Other months and new statements get it too. First match wins. The two income sources above are merchants too;
  add another income source by making an Income category and remembering its payer.
- **One-off edits** set one transaction's category. They beat merchants.
- **Settings** lists categories with their subcategories, people, subscriptions and types, accounts, merchants and one-off edits.

## Subscriptions

A subscription is a named regular payment, e.g. *iCloud+*: description contains `APPLE.COM/BILL`, £2.99, monthly.

- A payment gets a subscription when its description has the text and, if set, the amount
  (so Apple's subscriptions with one description are told apart by price).
- Two with the same price: the one whose last payment was about one period before wins.
- Wrong one? Pick another (or *Not a subscription*) in the edit window. That's saved for that payment only.
- **Types** (Subscription, Instalments, add your own) group them. **Number of payments** makes it "out of x":
  NHSBSA PPC, 10 × £11.45, shows *5/10* on each payment and "£57.25 of £114.50". *Paid before* counts payments from before your statements.
- **Status**: *Cancel!* (a reminder) or *Cancelled*, as a badge on the subscription and its payments.
- The Subscriptions section shows each one's price, payments, this month, total spent, last and next payment,
  roughly what the running ones cost a month, and spending that repeats like a subscription but has no name yet (*Name it*).

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

Everything is in one SQLite file, `myFinances/data/finance.db` (setting: *Database file*).
The tables are made by `myFinances/src/finances/db.py`.

| Table | Written by | Holds |
|---|---|---|
| `Trans` | myFinances (`make`) | one row per bank transaction; the plugin also fills in the worked-out `category_id` (a category or subcategory), `person_id`, `category_by` (`edit`, `rule`, `pair`), `subscription_id` and `payment` (5 of 10) |
| `Account` | both | accounts from statements (bank set) and ones you add here, with match text |
| `Category` | plugin | categories (`parent_id` empty) and subcategories; `person_id` = a person's own |
| `Person` | plugin | people, each under a People category (`category_id`) |
| `Type` | plugin | kinds of subscription: Subscription, Instalments... |
| `Subscription` | plugin | name, type, text, amount, period, number of payments, paid before, status |
| `Rule` | plugin | merchants, in order (first match wins) |
| `Label` | plugin | what you set by hand per transaction: one-off category, subcategory, person, subscription, note, tags, other account |
| Plugin settings | `data.json` in the plugin folder | |

Labels are saved against the transaction `id` that myFinances makes (a hash of account, date, amount and description),
in their own table, so re-running `make` never loses them.
Python and the plugin both use SQLite's file locking, so either can write at any time.
The dashboard reloads by itself when the file changes.
A database from another version isn't loaded or written to.

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
  data/              Database.ts (load/save the SQLite file) + sqlite.ts (runs sqlite3)
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
| By category | `categoryTable.ts` | table, share bars; expand a category into subcategories (People: people, then theirs), each with its total, then transactions |
| Subscriptions | `subscriptionTable.ts` | price, paid (5/10), this month, total, status dropdown; payments per subscription; look-alikes to name |
| By account | `accountTable.ts` | table with share bars |
| Transfers | `transfersTable.ts` | account → account per month, cells tinted by size, expand to move a transfer |
| Compared with last month | `comparison.ts` | bars from a centre line, vs 3-month average |
| Uncategorised | `uncategorisedList.ts` | pick a category for each description; remembered for that merchant |

Hide any section in settings. Shared pieces live next to them: `tableHead`, `shareBar`, `expandable`, `showMore`, `chartFrame`, `svgAxes`.
