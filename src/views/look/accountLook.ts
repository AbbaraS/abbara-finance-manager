import type { Account } from '../../models/Labels';
import { UNKNOWN_ACCOUNT } from '../../models/transferFlows';
import { colorCss } from './colorCss';

// Icon and colour of an account: set on the account (dev database Account.color / icon), else guessed from its name.
export function accountLook(account: string, accounts: Account[] = []): { icon: string; color: string } {
	const set = accounts.find((x) => x.name === account);
	const a = account.toLowerCase();
	const guess = account === UNKNOWN_ACCOUNT ? { icon: 'circle-help', color: 'gray' }
		: a.includes('credit') || a.includes('card') ? { icon: 'credit-card', color: 'blue' }
		: a.includes('saving') ? { icon: 'piggy-bank', color: 'green' }
		: a.includes('eur') ? { icon: 'euro', color: 'magenta' }
		: a.includes('revolut') ? { icon: 'smartphone', color: 'violet' }
		: { icon: 'landmark', color: 'yellow' };
	return { icon: set?.icon || guess.icon, color: colorCss(set?.color || guess.color) };
}
