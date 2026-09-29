import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../defaults/defaultSettings';
import { COLOR_NAMES } from './colors';
import type { FinanceSettings } from './FinanceSettings';

// Upgrades settings saved by an older version, in place.
export function migrateSettings(s: FinanceSettings): void {
	if ((s.version ?? 1) >= SETTINGS_VERSION) return;
	const defaults = new Map(DEFAULT_SETTINGS.categories.map((c) => [c.name, c]));

	// v2: Investment / Transfer kinds, colours and icons.
	for (const c of s.categories) {
		const d = defaults.get(c.name);
		if (d && c.kind === 'excluded' && (d.kind === 'investment' || d.kind === 'transfer')) c.kind = d.kind;
		c.icon ??= d?.icon ?? '';
		c.color ??= d?.color ?? leastUsedColor(s);
	}
	s.details ??= {};
	s.version = SETTINGS_VERSION;
}

// The colour fewest categories use, so new ones spread out.
export function leastUsedColor(s: FinanceSettings): string {
	const used = (name: string) => s.categories.filter((c) => c.color === name).length;
	return [...COLOR_NAMES].filter((n) => n !== 'gray').sort((a, b) => used(a) - used(b))[0];
}
