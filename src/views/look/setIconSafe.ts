import { getIcon, setIcon } from 'obsidian';

// Older Lucide names, for Obsidian versions that don't have the newer one.
const OLD_NAMES: Record<string, string> = {
	'chart-column': 'bar-chart-3',
	'circle-help': 'help-circle',
	'circle-slash': 'slash',
	'circle-dashed': 'circle',
	'git-compare-arrows': 'git-compare',
	'train-front': 'train',
	'hand-coins': 'coins',
	'heart-pulse': 'heart',
	'arrow-left-right': 'repeat',
};

// setIcon that falls back to an older name, then a plain circle, so an icon never goes missing.
export function setIconSafe(el: HTMLElement, id: string): void {
	const found = [id, OLD_NAMES[id], 'circle'].find((x) => x && getIcon(x));
	setIcon(el, found ?? id);
}
