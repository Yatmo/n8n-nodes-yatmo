/*
 * The neighbourhood text of /Summary/text, resolved to one language and rendered as HTML, Markdown
 * and plain text. Sentences carry [STRONG]...[/STRONG] markers around the key places.
 */
import type { IDataObject } from 'n8n-workflow';

export interface TextParagraph {
	iconId: string;
	title: string;
	titleStreet: string | null;
	titleCity: string | null;
	sentences: string[];
	items: string[];
}

export interface ResolvedText {
	language: string;
	paragraphs: TextParagraph[];
}

export interface RenderOptions {
	heading?: string | null;
	titles?: 'street-city' | 'city' | 'generic';
	paragraphs?: string[];
	strong?: boolean;
}

const STRONG_OPEN = '[STRONG]';
const STRONG_CLOSE = '[/STRONG]';

function pickLanguage(localized: IDataObject | undefined, language: string): string | null {
	if (!localized) return null;
	for (const candidate of [language, 'EN']) {
		if (localized[candidate]) return candidate;
	}
	const first = Object.keys(localized)[0];
	return first ?? null;
}

/** The requested language when the text exists in it, else EN, else the first one. */
export function resolveText(raw: IDataObject, language: string): ResolvedText {
	const wanted = language.toUpperCase();
	let used: string | null = null;
	const paragraphs: TextParagraph[] = [];
	for (const p of (raw.Paragraphs as IDataObject[] | undefined) ?? []) {
		const titles = p.Title as IDataObject | undefined;
		const lang = pickLanguage(titles, wanted);
		if (!lang) continue;
		used ??= lang;
		const pick = (list: unknown): string[] =>
			((list as IDataObject[] | undefined) ?? [])
				.map((s) => (s ? (s[lang] as string | undefined) : undefined))
				.filter((s): s is string => !!s);
		const sentences = pick(p.Sentences);
		const items = pick(p.List);
		if (sentences.length === 0 && items.length === 0) continue;
		paragraphs.push({
			iconId: String(p.IconId ?? ''),
			title: String(titles?.[lang] ?? ''),
			titleStreet: ((p.TitleBis as IDataObject | undefined)?.[lang] as string | undefined) ?? null,
			titleCity: ((p.TitleTer as IDataObject | undefined)?.[lang] as string | undefined) ?? null,
			sentences,
			items,
		});
	}
	return { language: used ?? wanted, paragraphs };
}

function escape(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function stripMarkers(text: string): string {
	return text.split(STRONG_OPEN).join('').split(STRONG_CLOSE).join('');
}

function toHtml(sentence: string, strong: boolean): string {
	const escaped = escape(sentence.trim());
	return strong ? escaped.split(STRONG_OPEN).join('<strong>').split(STRONG_CLOSE).join('</strong>') : stripMarkers(escaped);
}

function title(paragraph: TextParagraph, index: number, mode: string): string {
	if (mode === 'generic') return paragraph.title;
	if (mode === 'city') return index === 0 && paragraph.titleCity ? paragraph.titleCity : paragraph.title;
	if (index === 0 && paragraph.titleStreet) return paragraph.titleStreet;
	if (index === 1 && paragraph.titleCity) return paragraph.titleCity;
	return paragraph.title;
}

function select(text: ResolvedText, wanted?: string[]): TextParagraph[] {
	const set = (wanted ?? []).map((w) => w.toLowerCase());
	return set.length === 0 ? text.paragraphs : text.paragraphs.filter((p) => set.includes(p.iconId.toLowerCase()));
}

export function renderHtml(text: ResolvedText, options: RenderOptions = {}): string {
	const heading = options.heading === undefined ? 'h3' : options.heading;
	const strong = options.strong ?? true;
	const parts = select(text, options.paragraphs).map((p, index) => {
		let html = '';
		if (heading) html += `<${heading}>${escape(title(p, index, options.titles ?? 'street-city'))}</${heading}>`;
		if (p.sentences.length > 0) html += `<p>${p.sentences.map((s) => toHtml(s, strong)).join(' ')}</p>`;
		if (p.items.length > 0) html += `<ul>${p.items.map((i) => `<li>${toHtml(i, strong)}</li>`).join('')}</ul>`;
		return html;
	});
	return `<div class="yatmo-text">${parts.join('')}</div>`;
}

export function renderMarkdown(text: ResolvedText, options: RenderOptions = {}): string {
	const strong = options.strong ?? true;
	const md = (s: string) => (strong ? s.trim().split(STRONG_OPEN).join('**').split(STRONG_CLOSE).join('**') : stripMarkers(s.trim()));
	return select(text, options.paragraphs)
		.map((p, index) => {
			const lines = [`### ${title(p, index, options.titles ?? 'street-city')}`, ''];
			if (p.sentences.length > 0) lines.push(p.sentences.map(md).join(' '));
			lines.push(...p.items.map((i) => `- ${md(i)}`));
			return lines.join('\n');
		})
		.join('\n\n');
}

export function renderPlain(text: ResolvedText, options: RenderOptions = {}): string {
	return select(text, options.paragraphs)
		.map((p, index) => [title(p, index, options.titles ?? 'street-city'), ...p.sentences.map(stripMarkers), ...p.items.map((i) => `- ${stripMarkers(i)}`)].join('\n'))
		.join('\n\n');
}
