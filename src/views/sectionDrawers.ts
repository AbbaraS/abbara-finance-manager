import type { SectionId } from '../models/sections';
import type { DashboardContext } from './DashboardContext';
import { accountTable } from './sections/accountTable';
import { categoryCards } from './sections/categoryCards';
import { comparison } from './sections/comparison';
import { counterpartyTable } from './sections/counterpartyTable';
import { dailyLine } from './sections/dailyLine';
import { moneyInList } from './sections/moneyInList';
import { monthlyBars } from './sections/monthlyBars';
import { peopleCards } from './sections/peopleCards';
import { subscriptionTable } from './sections/subscriptionTable';
import { summaryCards } from './sections/summaryCards';
import { tagTable } from './sections/tagTable';
import { transfersTable } from './sections/transfersTable';
import { uncategorisedList } from './sections/uncategorisedList';

// The function that draws each section.
export const SECTION_DRAWERS: Record<SectionId, (el: HTMLElement, ctx: DashboardContext) => void> = {
	summary: summaryCards,
	monthly: monthlyBars,
	daily: dailyLine,
	moneyIn: moneyInList,
	category: categoryCards,
	people: peopleCards,
	counterparty: counterpartyTable,
	tags: tagTable,
	subscriptions: subscriptionTable,
	account: accountTable,
	transfers: transfersTable,
	comparison,
	uncategorised: uncategorisedList,
};
