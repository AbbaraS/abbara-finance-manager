import type { FinanceSettings } from '../../models/FinanceSettings';
import { formatCompact } from '../../utils/money';

// Horizontal gridlines with money labels, from 0 to `max` every `step`.
export function chartGrid(chart: HTMLElement, max: number, step: number, s: FinanceSettings): void {
	const grid = chart.createDiv({ cls: 'afm-grid' });
	for (let value = 0; value <= max; value += step) {
		const line = grid.createDiv({ cls: 'afm-gridline' });
		line.setCssStyles({ bottom: `${(value / max) * 100}%` });
		line.createSpan({ cls: 'afm-grid-label', text: formatCompact(value, s) });
	}
}
