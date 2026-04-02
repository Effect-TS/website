declare module "virtual:starlight/mixedbread-config" {
	const config: {
		apiKey: string;
		storeId: string;
		maxResults?: number;
		baseUrl?: string;
		disableUserPersonalization?: boolean;
	};
	export default config;
}
