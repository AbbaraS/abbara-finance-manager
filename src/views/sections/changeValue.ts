import { setIcon } from 'obsidian';
import type { FinanceSettings } from '../../models/FinanceSettings';
import { formatChange } from '../../utils/money';

// "↑ +£40.00" / "↓ −£12.00": arrow and sign, so it never relies on colour alone.
export function changeValue(parent: HTMLElement, change: number, s: FinanceSettings): void {
	const wrap = parent.createSpan({ cls: 'afm-change-value' });
	if (change !== 0) setIcon(wrap.createSpan({ cls: 'afm-change-icon' }), change > 0 ? 'arrow-up' : 'arrow-down');
	wrap.createSpan({ text: formatChange(change, s) });
}
