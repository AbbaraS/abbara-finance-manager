import type { SectionId } from '../models/sections';
import type { DashboardContext } from './DashboardContext';
import { accountTable } from './sections/accountTable';
import { categoryTable } from './sections/categoryTable';
import { comparison } from './sections/comparison';
import { dailyLine } from './sections/dailyLine';
import { moneyInList } from './sections/moneyInList';
import { monthlyBars } from './sections/monthlyBars';
import { summaryCards } from './sections/summaryCards';
import { uncategorisedList } from './sections/uncategorisedList';

// The function that draws each section.
export const SECTION_DRAWERS: Record<SectionId, (el: HTMLElement, ctx: DashboardContext) => void> = {
	summary: summaryCards,
	monthly: monthlyBars,
	daily: dailyLine,
	moneyIn: moneyInList,
	category: categoryTable,
	account: accountTable,
	comparison,
	uncategorised: uncategorisedList,
};
