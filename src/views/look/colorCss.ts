import { isColorName } from '../../models/colors';

// A category colour as CSS: named colours use the theme-aware variables, "#hex" is used as is.
export function colorCss(color: string): string {
	if (isColorName(color)) return `var(--afm-c-${color})`;
	return /^#[0-9a-f]{3,8}$/i.test(color) ? color : 'var(--afm-c-gray)';
}
