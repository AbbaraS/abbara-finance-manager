import type { Account } from '../../models/Labels';
import { accountLook } from '../look/accountLook';
import { iconDot } from '../look/iconDot';

// "(icon) account", in the account's colour.
export function accountName(parent: HTMLElement, account: string, accounts: Account[], cls = ''): HTMLElement {
	const look = accountLook(account, accounts);
	const el = parent.createSpan({ cls: `afm-row-title afm-account ${cls}`.trim() });
	iconDot(el, look.icon, look.color);
	el.createSpan({ text: account });
	return el;
}
