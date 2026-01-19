/// <reference types="vite/client" />

declare module "*.vue" {
	import type { DefineComponent } from "vue";
	// biome-ignore lint/suspicious/noExplicitAny: Standard Vue boilerplate
	// biome-ignore lint/complexity/noBannedTypes: Standard Vue boilerplate
	const component: DefineComponent<{}, {}, any>;
	export default component;
}
