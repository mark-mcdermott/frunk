import { Capacitor, registerPlugin } from '@capacitor/core';
import { NATIVE } from './platform';

/**
 * Reading a VIN with the camera, in the iOS app (`ios/App/App/VinScannerPlugin.swift`).
 *
 * The scan happens natively, in Apple's live data scanner, and only a VIN whose check
 * digit holds comes back. The web has no equivalent in Safari, and Android has no
 * scanner yet, so everywhere else `canScanVin` is false and the form keeps plain typing.
 */
interface VinScannerPlugin {
	isAvailable(): Promise<{ available: boolean }>;
	scan(): Promise<{ vin?: string }>;
}

const VinScanner = registerPlugin<VinScannerPlugin>('VinScanner');

export async function canScanVin(): Promise<boolean> {
	if (!NATIVE || Capacitor.getPlatform() !== 'ios') return false;
	try {
		return (await VinScanner.isAvailable()).available;
	} catch {
		// An app build from before the plugin existed answers "not implemented".
		return false;
	}
}

/** The VIN read, or null when the owner closed the scanner without one. */
export async function scanVin(): Promise<string | null> {
	return (await VinScanner.scan()).vin ?? null;
}

/** The plugin rejects with `DENIED` when camera access is off for the app. */
export const cameraDenied = (error: unknown) =>
	typeof error === 'object' && error !== null && 'code' in error && error.code === 'DENIED';
