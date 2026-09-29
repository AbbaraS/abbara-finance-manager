import { setIconSafe } from '../look/setIconSafe';
import { accountLook } from '../look/accountLook';
import { iconDot } from '../look/iconDot';

// "(icon) from → (icon) to".
export function flowName(parent: HTMLElement, from: string, to: string): void {
	const el = parent.createSpan({ cls: 'afm-flow' });
	for (const [i, account] of [from, to].entries()) {
		if (i === 1) setIconSafe(el.createSpan({ cls: 'afm-flow-arrow' }), 'arrow-right');
		const look = accountLook(account);
		const part = el.createSpan({ cls: 'afm-row-title' });
		iconDot(part, look.icon, look.color);
		part.createSpan({ text: account });
	}
}
