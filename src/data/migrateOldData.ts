import type FinancePlugin from '../main';
import { migrateToLabels, type OldSettings } from '../models/migrateToLabels';

// Once: moves categories, rules and edits out of an old data.json into the labels file.
// The old data.json is kept as data-v2-backup.json in the plugin folder.
export async function migrateOldData(plugin: FinancePlugin, saved: OldSettings | null): Promise<void> {
	if (!saved || (saved.version ?? 1) >= 3) return;
	const dir = plugin.manifest.dir ?? '';
	await plugin.app.vault.adapter.write(`${dir}/data-v2-backup.json`, JSON.stringify(saved, null, '\t'));
	if (plugin.labels.isEmpty()) {
		plugin.labels.data = migrateToLabels(saved);
		await plugin.labels.save();
	}
	await plugin.saveData(plugin.settings); // version 3, old fields dropped
}
