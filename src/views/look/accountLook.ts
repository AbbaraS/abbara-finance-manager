import { UNKNOWN_ACCOUNT } from '../../models/transferFlows';
import { colorCss } from './colorCss';

// Icon and colour guessed from the account name.
export function accountLook(account: string): { icon: string; color: string } {
	const a = account.toLowerCase();
	if (account === UNKNOWN_ACCOUNT) return { icon: 'circle-help', color: colorCss('gray') };
	if (a.includes('credit')) return { icon: 'credit-card', color: colorCss('orange') };
	if (a.includes('saving')) return { icon: 'piggy-bank', color: colorCss('green') };
	if (a.includes('revolut')) return { icon: 'smartphone', color: colorCss('violet') };
	return { icon: 'landmark', color: colorCss('blue') };
}
