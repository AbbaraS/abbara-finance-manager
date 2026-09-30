import { copyDefaultSettings } from '../defaults/defaultSettings';
import type { FinanceSettings } from './FinanceSettings';

// Settings from saved data: known fields only (old ones like `rules` are dropped), defaults for the rest.
export function settingsFrom(saved: Record<string, unknown>): FinanceSettings {
	const s = copyDefaultSettings();
	const fields = s as unknown as Record<string, unknown>;
	for (const key of Object.keys(fields)) {
		if (key !== 'version' && saved[key] !== undefined) fields[key] = saved[key];
	}
	return s;
}
