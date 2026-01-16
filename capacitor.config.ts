import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'app.frunk.mobile',
	appName: 'Frunk',
	webDir: 'build',
	server: {
		// During development, you can use live reload by uncommenting:
		// url: 'http://YOUR_LOCAL_IP:5173',
		// cleartext: true
	},
	ios: {
		contentInset: 'automatic'
	},
	android: {
		allowMixedContent: false
	}
};

export default config;
