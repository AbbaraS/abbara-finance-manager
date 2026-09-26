// A row of colour swatches with labels. `cls` sets each swatch's colour in CSS.
export function chartLegend(parent: HTMLElement, items: { label: string; cls: string }[]): void {
	const legend = parent.createDiv({ cls: 'afm-legend' });
	for (const item of items) {
		const entry = legend.createDiv({ cls: 'afm-legend-item' });
		entry.createSpan({ cls: `afm-swatch ${item.cls}` });
		entry.createSpan({ text: item.label });
	}
}
