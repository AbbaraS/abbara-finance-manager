import type { SectionId } from '../models/sections';
import { uncategorised } from '../models/uncategorised';
import type { DashboardContext } from './DashboardContext';
import { accountTable } from './sections/accountTable';
import { categoryCards } from './sections/categoryCards';
import { comparison } from './sections/comparison';
import { dailyLine } from './sections/dailyLine';
import { debtCards } from './sections/debtCards';
import { moneyInList } from './sections/moneyInList';
import { monthlyBars } from './sections/monthlyBars';
import { peopleCards } from './sections/peopleCards';
import { subscriptionTable } from './sections/subscriptionTable';
import { summaryCards } from './sections/summaryCards';
import { topLists } from './sections/topLists';
import { transferLinks } from './sections/transferLinks';
import { transfersTable } from './sections/transfersTable';
import { uncategorisedList } from './sections/uncategorisedList';

// Sections left out when they have nothing to show this month.
export const SECTION_EMPTY: Partial<Record<SectionId, (ctx: DashboardContext) => boolean>> = {
	uncategorised: (ctx) => uncategorised(ctx.rows, ctx.month, ctx.settings).length === 0,
};

// The function that draws each section.
export const SECTION_DRAWERS: Record<SectionId, (el: HTMLElement, ctx: DashboardContext) => void> = {
	summary: summaryCards,
	monthly: monthlyBars,
	daily: dailyLine,
	moneyIn: moneyInList,
	category: categoryCards,
	people: peopleCards,
	debts: debtCards,
	top: topLists,
	subscriptions: subscriptionTable,
	account: accountTable,
	transfers: transfersTable,
	transferLinks,
	comparison,
	uncategorised: uncategorisedList,
};
