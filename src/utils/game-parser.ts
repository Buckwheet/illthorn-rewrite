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
	private buffer: string = "";
	private currentStream: string = "main";

	parse(input: string): ParseResult {
		this.buffer += input;

		let cleanText = "";
		const tags: GameTag[] = [];

		// Loop to find tags
		while (true) {
			// Find next tag start
			const tagStart = this.buffer.indexOf("<");
			if (tagStart === -1) {
				// No tags remaining.
				// If the buffer HAS content, and NO '<', it is pure text. Process it.
				if (this.buffer.length > 0) {
					const text = this.buffer;

					let styleClass = "";
					const prevTag = tags[tags.length - 1];
					if (
						prevTag &&
						(prevTag.name === "preset" || prevTag.name === "style") &&
						prevTag.attributes["id"]
					) {
						styleClass = prevTag.attributes["id"];
					}

					this.processText(text, tags, this.currentStream);
					cleanText += this.textToClean(text, this.currentStream, styleClass);
					this.buffer = "";
				}
				break;
			}

			// We have a '<'. Is there text before it?
			if (tagStart > 0) {
				const text = this.buffer.substring(0, tagStart);

				let styleClass = "";
				const prevTag = tags[tags.length - 1];
				if (
					prevTag &&
					(prevTag.name === "preset" || prevTag.name === "style") &&
					prevTag.attributes["id"]
				) {
					styleClass = prevTag.attributes["id"];
				}

				this.processText(text, tags, this.currentStream);
				cleanText += this.textToClean(text, this.currentStream, styleClass);
				this.buffer = this.buffer.substring(tagStart);
				continue; // Loop again, now buffer starts with '<'
			}

			// Buffer starts with '<'. Find closing '>'.
			const tagEnd = this.buffer.indexOf(">");
			if (tagEnd === -1) {
				// Incomplete tag. Stop processing and wait for next chunk.
				break;
			}

			// We have a complete tag <...>
			const fullTag = this.buffer.substring(0, tagEnd + 1);
			this.buffer = this.buffer.substring(tagEnd + 1);

			this.processTag(fullTag, tags);
		}

		return { cleanText, tags };
	}

	private processText(content: string, tags: GameTag[], stream: string) {
		const escaped = content
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		// Check for active style from last tag (redundant check if caller does it, but useful for tagging :text)
		let styleClass = "";
		const lastTag = tags[tags.length - 1];
		if (
			lastTag &&
			(lastTag.name === "preset" || lastTag.name === "style") &&
			lastTag.attributes["id"] &&
			!lastTag.text
		) {
			styleClass = lastTag.attributes["id"];
		}

		tags.push({
			name: ":text",
			attributes: { stream, style: styleClass },
			text: escaped,
		});
	}

	private textToClean(
		content: string,
		stream: string,
		styleClass: string,
	): string {
		// Allow 'main' AND 'room' streams to appear in clean text (Main Feed)
		if (stream !== "main" && stream !== "room") return "";
		const escaped = content
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		if (styleClass) {
			return `<span class="preset-${styleClass}">${escaped}</span>`;
		}
		return escaped;
	}

	private processTag(fullTag: string, tags: GameTag[]) {
		const tagContent = fullTag.substring(1, fullTag.length - 1);
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
		const attrRegex = /(\w+)\s*=\s*['"]([^'"]+)['"]/g;
		let match = attrRegex.exec(attrString);
		while (match !== null) {
			attributes[match[1]] = match[2];
			match = attrRegex.exec(attrString);
		}

		// Handle State Logic (Streams)
		if (tagName === "stream") {
			if (isClose) {
				this.currentStream = "main";
			} else {
				this.currentStream = attributes["id"] || "main";
			}
		}

		tags.push({ name: tagName, attributes, text: "" });
	}
}
