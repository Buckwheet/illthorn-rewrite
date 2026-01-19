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

		let currentStream = "main"; // default

		const parts = input.split(/(<[^>]+>)/g);

		for (const part of parts) {
			if (part.startsWith("<")) {
				const tagContent = part.substring(1, part.length - 1);
				const isClose = tagContent.startsWith("/");

				const cleanTag = tagContent.replace("/", "").trim();
				const firstSpace = cleanTag.indexOf(" ");
				let tagName = cleanTag;
				let attrString = "";

				if (firstSpace !== -1) {
					tagName = cleanTag.substring(0, firstSpace);
					attrString = cleanTag.substring(firstSpace + 1);
				}

				const attributes: Record<string, string> = {};
				const attrRegex = /(\w+)=['"]([^'"]+)['"]/g;
				let match = attrRegex.exec(attrString);
				while (match !== null) {
					attributes[match[1]] = match[2];
					match = attrRegex.exec(attrString);
				}

				// Track Stream State
				if (tagName === "stream") {
					if (isClose) {
						currentStream = "main";
					} else {
						currentStream = attributes["id"] || "main";
					}
				}

				tags.push({ name: tagName, attributes, text: "" }); // Placeholder
			} else if (part.length > 0) {
				// Text Content
				const escaped = part
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");

				// Find if the previous tag was a valid style opener
				let styleClass = "";
				const lastTag = tags[tags.length - 1];
				if (
					lastTag &&
					(lastTag.name === "preset" || lastTag.name === "style") &&
					lastTag.attributes["id"]
				) {
					styleClass = lastTag.attributes["id"];
				}

				tags.push({
					name: ":text",
					attributes: { stream: currentStream, style: styleClass },
					text: escaped,
				});

				if (currentStream === "main") {
					if (styleClass) {
						cleanText += `<span class="preset-${styleClass}">${escaped}</span>`;
					} else {
						cleanText += escaped;
					}
				}
			}
		}

		return { cleanText, tags };
	}
}
