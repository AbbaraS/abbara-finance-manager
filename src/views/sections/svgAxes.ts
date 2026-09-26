import type { FinanceSettings } from '../../models/FinanceSettings';
import { formatCompact } from '../../utils/money';
import type { ChartFrame } from './chartFrame';

// Gridlines with money labels, a dashed zero line, and day labels along the bottom.
export function svgAxes(svg: SVGElement, f: ChartFrame, range: { min: number; max: number; step: number }, days: number, s: FinanceSettings): void {
	const right = f.width - f.pad.right;

	// Money.
	for (let v = range.min; v <= range.max + 1e-9; v += range.step) {
		const y = f.y(v);
		svg.createSvg('line', { cls: Math.abs(v) < 1e-9 ? 'afm-svg-zero' : 'afm-svg-grid', attr: { x1: f.pad.left, x2: right, y1: y, y2: y } });
		text(svg, f.pad.left - 8, y + 4, formatCompact(v, s), 'end');
	}

	// Days.
	for (const d of [1, 8, 15, 22, days]) {
		text(svg, f.x(d), f.height - 6, String(d), 'middle');
	}
}

// A small muted SVG label.
function text(svg: SVGElement, x: number, y: number, value: string, anchor: string): void {
	const t = svg.createSvg('text', { cls: 'afm-axis-text', attr: { x, y, 'text-anchor': anchor } });
	t.textContent = value;
}
