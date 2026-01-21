export interface GameTag {
	name: string;
	attributes: Record<string, string>;
	text?: string;
	children?: GameTag[];
	isClosing?: boolean;
}

export interface ParseResult {
	cleanText: string;
	tags: GameTag[];
}

export class GameParser {
	private buffer: string = "";
	private currentStream: string = "main";
	private inHiddenTag: boolean = false;
	private componentId: string | null = null;

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
		const processedEscaped = content
			.replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, "&amp;")
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
			attributes: { stream, style: styleClass, component: this.componentId || "" },
			text: processedEscaped,
		});
	}

	private textToClean(
		content: string,
		stream: string,
		styleClass: string,
	): string {
		// Only 'main' stream appears in clean text (Main Feed)
		// Added: Suppress 'room' stream because it has its own window now and was causing spam.
		if (stream !== "main") return "";

		// Suppress room components from Main Feed (they go to Room window)
		if (this.componentId && this.componentId.startsWith("room")) return "";

		// Suppress content if we are inside a hidden tag (like Hand info)
		if (this.inHiddenTag) return "";

		const cleanEscaped = content
			.replace(/&(?!(?:amp|lt|gt|quot|apos);)/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		if (styleClass) {
			return `<span class="preset-${styleClass}">${cleanEscaped}</span>`;
		}
		return cleanEscaped;
	}

	private processTag(fullTag: string, tags: GameTag[]) {
		const tagContent = fullTag.substring(1, fullTag.length - 1);
		const isClose = tagContent.startsWith("/");

		// Remove leading slash if closing tag </tag>
		let rawContent = tagContent;
		if (isClose) {
			rawContent = rawContent.substring(1);
		}
		// Remove trailing slash if self-closing <tag />
		if (rawContent.endsWith("/")) {
			rawContent = rawContent.substring(0, rawContent.length - 1);
		}

		const cleanTag = rawContent.trim();
		const firstSpace = cleanTag.indexOf(" ");

		let tagName = cleanTag;
		let attrString = "";

		if (firstSpace !== -1) {
			tagName = cleanTag.substring(0, firstSpace);
			attrString = cleanTag.substring(firstSpace + 1);
		}

		const attributes: Record<string, string> = {};
		// Regex to match key='value', key="value", or key=value (unquoted)
		const attrRegex = /(\w+)\s*=\s*(?:['"]([^'"]*)['"]|([^'"\s>]+))/g;
		let match = attrRegex.exec(attrString);
		while (match !== null) {
			const key = match[1];
			const value = match[2] !== undefined ? match[2] : match[3];
			attributes[key] = value;
			match = attrRegex.exec(attrString);
		}


		// Handle State Logic (Streams)
		// Standard StormFront uses pushStream/popStream
		if (tagName === "stream" || tagName === "pushStream") {
			if (isClose) {
				// <stream> shouldn't really close via </stream> if it's pushStream, but standard simple stream might.
				// Assuming popStream handles popping.
				this.currentStream = "main";
			} else {
				this.currentStream = attributes["id"] || "main";
			}
		}

		if (tagName === "popStream") {
			this.currentStream = "main";
			// Ideally we should use a stack, but for GSIV 'main' is usually the fallback.
			// If nested streams exist, a stack would be better.
			// For now, reset to main is likely sufficient for Thoughts/Deaths.
		}

		// Handle Components (Room Description, Room Objs, etc.)
		if (tagName === "component" || tagName === "compDef") {
			if (isClose) {
				this.componentId = null;
			} else {
				this.componentId = attributes["id"] || null;
			}
		}

		// Handle Hidden Tags (Hands, etc) to suppress output in feed
		// These tags contain text that should be parsed into state, but NOT shown in feed.
		const hiddenTags = ["left", "right", "spell", "inv", "dialogData"];
		if (hiddenTags.includes(tagName)) {
			if (isClose) {
				this.inHiddenTag = false;
			} else {
				this.inHiddenTag = true;
			}
		}

		tags.push({ name: tagName, attributes, text: "", isClosing: isClose });
	}
}
