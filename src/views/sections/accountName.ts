import { accountLook } from '../look/accountLook';
import { iconDot } from '../look/iconDot';

// "(icon) account".
export function accountName(parent: HTMLElement, account: string, cls = ''): HTMLElement {
	const look = accountLook(account);
	const el = parent.createSpan({ cls: `afm-row-title afm-account ${cls}`.trim() });
	iconDot(el, look.icon, look.color);
	el.createSpan({ text: account });
	return el;
}
