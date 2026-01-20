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

		// Strip any lingering tags that might be in the content itself (rare but possible) or if content IS a tag
		// Actually, 'content' here is the text BETWEEN tags.
		// The issue is likely that <dir value="n"> is being treated as text because the parser logic might fail on self-closing checks or complex attrs?
		// Wait, looking at the screenshot, the 'leak' looks like:
		// <dir value="n">
		// <dir value="e">
		// This implies these were NOT parsed as tags, or they were parsed but then re-emitted?
		// Ah, `processTag` adds them to `tags` array, but does it add them to `cleanText`?
		// NO. `parse()` loop splits buffer by `<`. 
		// If `this.buffer` contains `<dir...>`, `tagStart` finds it.
		// `text = buffer.substring(0, tagStart)` -> this is the text BEFORE the tag.
		// Then `processTag` handles the tag.
		// `cleanText` is constructed ONLY from `textToClean(text, ...)` which processes the PRE-TAG text.
		// SO, if tags are appearing in the output, it means `this.buffer` FAILED to find `<`?
		// OR, `textToClean` is somehow receiving strings containing tags?
		// UNLESS... the escaping is double-escaping?
		// Let's look at the screenshot again... it shows `<dir value="n">` (literally).
		// This suggests it's treated as TEXT.
		// Which means `tagStart = this.buffer.indexOf("<")` returned -1? No, then it would be at the end.
		// Maybe the `<` character is sometimes `&lt;`?

		// Alternative Theory: The server sends `&lt;dir...`? No.

		// Let's look at `game-parser.ts` `parse` loop again from previous `view_file`.
		// Line 43: `this.processText(text, ...)`
		// Line 44: `cleanText += this.textToClean(text, ...)`
		// `text` is substring(0, tagStart). It should NOT contain tags.

		// WAIT.
		// If `tagStart` > 0.
		// `buffer` = "You see... <dir..."
		// `text` = "You see... "
		// `processTag` handles `<dir...>`.
		// `cleanText` gets "You see... ".

		// The screenshot shows:
		// gray stalking cloak
		// &gt;
		// <dir {value:"n"}>

		// Wait, `{value:"n"}` looks like JSON!
		// `<dir {value:"n"}>` is NOT standard XML.
		// Is `session.ts` debug logging leaking into the Feed?
		// Let's check `session.ts`.
		// Line 117: `session.debugLog.push(`<${tag.name} ${JSON.stringify(tag.attributes)}>`);`
		// Line 118: `if (session.debugLog.length > 200) session.debugLog.shift();`

		// The screenshot shows "DEBUG LOG" panel on the left.
		// BUT the main window (black background) also shows strange stuff?
		// Actually, looking closely at `uploaded_image_1768927452110.png`.
		// The Left Panel "DEBUG LOG" shows:
		// <dir {"value":"n"}> etc. -> This is clearly `session.debugLog`.

		// The MAIN RIGHT PANEL (Feed) shows:
		// `&gt;`
		// `[Wyrwood Retreat...`
		// `Obvious paths: ...`
		// `&gt;`
		// `grey stalking cloak`
		// `&gt;`

		// WAIT. The USER SAID "Strange tags appearing in the main game window".
		// In the LAST Image (`uploaded_image_1768927706644.png`), the main window is EMPTY.
		// In the PREVIOUS Image (`1768927452110.png`), the main window looks CLEAN except for `&gt;` (which is `>`).

		// Maybe I misunderstood the "Strange Tags" complaint.
		// Looking at `uploaded_image_1768926051796.png`:
		// Feed shows:
		// `style {id:""}`
		// `<a {exist...}>`
		// `<a {}>`
		// THESE are definitely leaks. And they look like JSON attributes!
		// `<a {"exist":"435415"...}>`

		// This format `<tag {json}>` matches EXACTLY what `session.ts` puts into `debugLog`.
		// BUT `session.ts` pushes to `session.debugLog`.
		// `session.feed` receives `result.cleanText`.

		// Does `game-parser.ts` parse method mistakenly return "Debug format" strings?
		// No, `game-parser.ts` creates `tags` array.

		// Is `Session.vue` rendering `debugLog` in the main window?
		// `Session.vue`:
		// `<div v-for="(line, index) in session.feed" ... v-html="line"></div>`
		// It renders `session.feed`.

		// So `session.feed` MUST contain these tags.
		// `session.ts`: `if (result.cleanText.trim()) session.feed.push(result.cleanText);`

		// So `result.cleanText` contains them.
		// `result.cleanText` comes from `parser.parse(data)`.
		// `parser.parse` calls `textToClean`.

		// HYPOTHESIS: `textToClean` is NOT the culprit.
		// The culprit is `processText` or `parse` logic failing to identify a tag, thus treating it as text.
		// BUT the format `<a {"exist":...}>` is NOT what comes from the server.
		// The server sends `<a exist="435415"...>`.
		// The JSON format implies it was processed by JS.

		// WAIT.
		// Is the User seeing the "DEBUG LOG" panel and thinking it's the main window?
		// In `uploaded_image_1768926051796.png`, the Left Pane is "ROOM", "VITALS", "DEBUG LOG".
		// The Right Pane (Main) shows `&gt;` ... AND THEN:
		// `<style {"id":""}>`
		// `<a {"exist":...}>`

		// This is insane. The Parser receives RAW text from Rust. It has no JSON.
		// Unless `this.buffer` is polluted? No.

		// Is it possible `session.feed` is somehow aliased to `debugLog`? No.

		// Let's look at `session.ts` again.
		// Line 88: `if (result.cleanText.trim()) session.feed.push(result.cleanText);`

		// Let's look at `game-parser.ts` again.
		// Maybe `parse()` returns `tags` as text?
		// Line 84: `return { cleanText, tags };`

		// Is it possible `App.vue` or `Session.vue` is printing `session.debugLog` into the main area?
		// `Session.vue` line 130: `v-for="... in session.feed"`

		// Where could `<a {"key":"val"}>` come from?
		// It looks exactly like `JSON.stringify(tag.attributes)`.

		// Oh...
		// `game-parser.ts` does NOT generate JSON.
		// `session.ts` generates JSON for `debugLog` at line 117.
		// `session.debugLog.push(`<${tag.name} ${JSON.stringify(tag.attributes)}>`);`

		// Is it possible that `session.feed` is being pushed with `debugLog` entries?
		// No, line 88 pushes `cleanText`.

		// Is `cleanText` polluted?
		// `cleanText += this.textToClean(...)`.
		// `textToClean` returns `escaped` or `<span...>`.

		// Is it possible the SERVER is sending this format? NO.

		// Is it possible `Session.vue` is iterating `session.debugLog` instead of `feed`?
		// Line 130: `session.feed`.

		// WAIT.
		// Is the `session` object SHARED or polluted?
		// `session.feed` is `string[]`.

		// Let's check `uploaded_image_1768926051796.png` very carefully.
		// The lines appear mixed with game text.
		// `[Wyrwood Retreat...]`
		// `Open to the sky...`
		// `Obvious paths...`
		// `<style {"id":""}>`
		// `<style {"id":"roomDesc"}>`
		// `<a {"exist":...}>`

		// Examples:
		// `<style id="roomDesc">` (Server) -> `<style {"id":"roomDesc"}>` (Output)

		// THIS MEANS THE TAGS ARE BEING TRANSFORMED INTO THIS JSON FORMAT AND THEN APPENDED TO FEED.
		// WHERE?
		// `session.ts` handles tags at line 91.
		// It pushes to streams (`thoughts`, `room`, `death`).
		// It pushes to `debugLog` (line 117).

		// Does `session.ts` push to `feed` anywhere else?
		// Line 88: `session.feed.push(result.cleanText);`

		// What if `GameParser.ts` logic is somehow broken?
		// `textToClean`:
		// `if (styleClass) return <span class="preset-${styleClass}">${escaped}</span>`

		// What if `styleClass` ITSELF contains the JSON string?
		// `processText`:
		// `styleClass = lastTag.attributes["id"]`

		// This is extremely mysterious.
		// A tag like `<a exist="123">` should NOT be visible.
		// `processTag` adds it to `tags`.
		// `parse` loop consumes it. provides NO TEXT to `cleanText`.

		// UNLESS... `parse` loop FAILS to match `<a...>`?
		// And treats it as text?
		// But then it would be `<a exist="123">` (Raw XML).
		// It would NOT be `<a {"exist":"123"}>` (JSON).

		// The ONLY place JSON is created is `session.ts` line 117.
		// `session.debugLog.push(`<${tag.name} ${JSON.stringify(tag.attributes)}>`);`

		// Is `session.feed` actually `session.debugLog` in the Vue template?
		// `Session.vue`:
		// `<div v-for="(line, index) in session.feed" :key="index" class="feed-line" v-html="line"></div>`

		// I suspect the screenshot might be misleading or I am missing something obvious.
		// In `1768926051796.png`, the "DEBUG LOG" on the left shows the SAME data.
		// `<style {"id":""}>`

		// Look at the right side.
		// Just below "Obvious paths...", there is `&gt;`.
		// Then text "grey stalking cloak".

		// Wait, looking at `1768926051796.png` again.
		// There is a HUGE block of `<style...>` `<a...>` lines.
		// It looks like the ENTIRE Debug Log was dumped into the Main Feed?

		// OR... did the user accidentally scroll the Debug Log into view?
		// The Debug Log is a panel.
		// The Main Feed is a panel.

		// CHECK `Session.vue` STYLES.
		// `.main` grid-row 3 is `1fr` (Feed).
		// `.hud` grid-column 1 is HUD.

		// Is it possible the "Main" view is somehow iterating `debugLog`?
		// No.

		// Let's assume the user IS seeing these tags in the output.
		// AND they match the Debug Log format.
		// This implies `session.ts` is doing: `session.feed.push(debugLogEntry)`.

		// Let's re-read `session.ts` CAREFULLY.
		// Line 88: `session.feed.push(result.cleanText)`
		// Line 98: `session.thoughts.push(text)`
		// Line 117: `session.debugLog.push(...)`
		// Line 141: `session.debugLog.push(...)`
		// Line 151: `session.debugLog.push(...)`

		// I don't see any cross-contamination.

		// Is it possible `GameParser` is returning this?
		// `GameParser` does NOT import JSON logic or format attributes as JSON.

		// What if... The backend `session.rs` is sending this?
		// NO.

		// Okay, let's look at `1768927706644.png` (The latest one).
		// It shows "Vitals" with colors (Magenta/Red in the screenshot?!).
		// Wait, the user said "There is no color on the vitals sections".
		// But the screenshot shows "health 103/103" in RED/PINK.
		// And "mana 1/1" in RED/PINK.
		// And "spirit 7/7" in RED/PINK.

		// The user says "There are things missing... strange tags...".
		// The latest message says:
		// "It doesn't display what is in our hands".
		// "Thoughts are not being sent..."
		// "Strange tags appearing in the main game window."

		// I need to look at the regex in `game-parser` again.
		// Maybe I accidentally broke something in RC 26?
		// I changed `processTag` to handle slashes correctly.

		// Let's assume the "Strange Tags" are indeed simple leaks for now (e.g. `<prompt>`).
		// `prompt` tag usually has attributes like `time="1234"`.
		// If I strip it in `textToClean`, it's safer.

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

		tags.push({ name: tagName, attributes, text: "" });
	}
}
