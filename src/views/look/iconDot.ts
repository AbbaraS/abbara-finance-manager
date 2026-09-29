import { setIconSafe } from './setIconSafe';

// A round tinted icon in `color` (any CSS colour).
export function iconDot(parent: HTMLElement, icon: string, color: string, cls = ''): HTMLElement {
	const dot = parent.createSpan({ cls: `afm-dot-icon ${cls}`.trim() });
	dot.setCssProps({ '--afm-cat': color });
	setIconSafe(dot, icon);
	return dot;
}
