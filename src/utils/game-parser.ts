export interface GameTag {
	name: string;
	attributes: Record<string, string>;
	text?: string;
	children?: GameTag[];
}

export interface ParseResult {
	cleanText: string;
	tags: GameTag[];
}

export class GameParser {
	static parse(input: string): ParseResult {
		let cleanText = "";
		const tags: GameTag[] = [];

		// Simple regex-based parsing for now (robust enough for GSIV stream)
		// We want to capture tags <...> and text content between them
		const parts = input.split(/(<[^>]+>)/g);

		for (const part of parts) {
			if (part.startsWith("<")) {
				// It's a tag
				const tagContent = part.substring(1, part.length - 1);

				// Parse attributes
				// <progressBar id='health' value='100'/>
				// name: progressBar
				// attrs: { id: health, value: 100 }

				const cleanTag = tagContent.replace("/", "").trim();
				const firstSpace = cleanTag.indexOf(" ");
				let tagName = cleanTag;
				let attrString = "";

				if (firstSpace !== -1) {
					tagName = cleanTag.substring(0, firstSpace);
					attrString = cleanTag.substring(firstSpace + 1);
				}

				const attributes: Record<string, string> = {};
				// Regex for attributes: key='value' or key="value"
				// This is a naive parser, assuming well-formed attributes
				const attrRegex = /(\w+)=['"]([^'"]+)['"]/g;
				let match = attrRegex.exec(attrString);
				while (match !== null) {
					attributes[match[1]] = match[2];
					match = attrRegex.exec(attrString);
				}

				tags.push({ name: tagName, attributes });

				// Special handling: formatting tags might need to stay in text?
				// For now, strip ALL tags from text view
			} else if (part.trim().length > 0 || part.includes("\n")) {
				// HTML Escape text
				const escaped = part
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
				cleanText += escaped;
			}
		}

		return { cleanText, tags };
	}
}
