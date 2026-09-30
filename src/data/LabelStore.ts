import { normalizePath, Notice, type App } from 'obsidian';
import { emptyLabels } from '../defaults/defaultLabels';
import type { Labels } from '../models/Labels';

// Reads and writes your labels file (JSON in the vault).
export class LabelStore {
	data: Labels = emptyLabels();
	private text = '';      // last text read or written, to spot outside changes
	private broken = false; // the file didn't parse: never overwrite it

	constructor(private app: App, private path: () => string) {}

	// Reads the file; a missing file means no labels yet. Returns true when something changed.
	async load(): Promise<boolean> {
		const path = normalizePath(this.path());
		const adapter = this.app.vault.adapter;
		const text = (await adapter.exists(path)) ? await adapter.read(path) : '';
		if (text === this.text) return false;
		this.text = text;
		try {
			this.data = text.trim() ? { ...emptyLabels(), ...JSON.parse(text) } : emptyLabels();
			this.broken = false;
		} catch {
			this.broken = true;
			new Notice(`Finance: ${path} isn't valid JSON. Fix it; it won't be overwritten until then.`);
		}
		return true;
	}

	// Writes the file (making its folder if needed), unless it failed to load.
	async save(): Promise<void> {
		if (this.broken) return void new Notice('Finance: labels not saved, the labels file has a JSON error.');
		const path = normalizePath(this.path());
		const adapter = this.app.vault.adapter;
		const folder = path.split('/').slice(0, -1).join('/');
		if (folder && !(await adapter.exists(folder))) await adapter.mkdir(folder);
		this.text = JSON.stringify(this.data, null, '\t') + '\n';
		await adapter.write(path, this.text);
	}

	// After the path setting changed: loads the file there, or moves the current labels there if there's none.
	async switchFile(): Promise<void> {
		if (await this.app.vault.adapter.exists(normalizePath(this.path()))) await this.load();
		else await this.save();
	}

	// True when nothing is saved yet.
	isEmpty(): boolean {
		return Object.keys(this.data.transactions).length === 0 && this.data.rules.length === 0;
	}
}
