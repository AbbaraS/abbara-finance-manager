import { normalizePath, Notice, type App } from 'obsidian';
import { copyDefaultLabels, LABELS_VERSION } from '../defaults/defaultLabels';
import type { Labels } from '../models/Labels';

// Reads and writes your labels file (JSON in the vault).
export class LabelStore {
	data: Labels = copyDefaultLabels();
	private text = '';      // last text read or written, to spot outside changes
	private broken = false; // the file can't be used: never overwrite it

	constructor(private app: App, private path: () => string) {}

	// Reads the file, or makes it from the defaults when there's none. Returns true when something changed.
	async load(): Promise<boolean> {
		const path = normalizePath(this.path());
		const adapter = this.app.vault.adapter;
		if (!(await adapter.exists(path))) {
			this.data = copyDefaultLabels();
			this.broken = false;
			await this.save();
			return true;
		}
		const text = await adapter.read(path);
		if (text === this.text) return false;
		this.text = text;
		try {
			const data = JSON.parse(text);
			if (data.version !== LABELS_VERSION) throw new Error(`it's version ${data.version}, this plugin uses ${LABELS_VERSION}`);
			this.data = { ...copyDefaultLabels(), ...data };
			this.broken = false;
		} catch (e) {
			this.broken = true;
			new Notice(`Finance: can't use ${path}: ${(e as Error).message}. Fix, rename or delete it; it won't be overwritten.`, 0);
		}
		return true;
	}

	// Writes the file (making its folder if needed), unless the file there can't be used.
	async save(): Promise<void> {
		if (this.broken) return void new Notice('Finance: labels not saved, the labels file can\'t be used.');
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
}
