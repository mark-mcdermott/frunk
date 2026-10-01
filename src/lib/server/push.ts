import { createPrivateKey, createSign } from 'node:crypto';
import { connect } from 'node:http2';
import { APNS_HOST, APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID } from 'astro:env/server';

/**
 * Push notifications, through Apple's service directly.
 *
 * APNs speaks HTTP/2 and authenticates each connection with a short JWT signed by the
 * team's `.p8` key — small enough to do with `node:http2` and `node:crypto`, and one
 * less SDK to carry. Android (FCM) is not here yet: its tokens are stored like any
 * other, and nothing sends to them until a sender exists.
 *
 * **Which Apple host a token belongs to is not something the token says.** A build
 * run from Xcode gets a sandbox token, a TestFlight or App Store build a production
 * one, and each host answers `BadDeviceToken` for the other's. So production is tried
 * first and the sandbox second, rather than asking a setting to stay in step with how
 * each phone happened to install the app.
 */
const BUNDLE_ID = 'com.frunk.app';
const HOSTS = ['https://api.push.apple.com', 'https://api.sandbox.push.apple.com'];
const TIMEOUT_MS = 10_000;

export const pushConfigured = () => Boolean(APNS_KEY && APNS_KEY_ID && APNS_TEAM_ID);

export interface PushMessage {
	title: string;
	body: string;
	/** Rides along untouched; the app reads `vehicleId` to open the right screen. */
	data?: Record<string, string>;
}

/**
 * `sent` reached Apple. `gone` means the token is no longer an address — the app was
 * removed, or the token belongs to neither host — and should be forgotten. `failed` is
 * anything else, worth another try on the next run.
 */
export type PushOutcome = 'sent' | 'gone' | 'failed';

const base64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');

/** Apple accepts a provider token for an hour and throttles ones minted too often. */
let provider: { jwt: string; issuedAt: number } | null = null;

function providerToken(): string {
	const now = Math.floor(Date.now() / 1000);
	if (provider && now - provider.issuedAt < 50 * 60) return provider.jwt;

	// An env var's newlines often arrive as the two characters `\n`.
	const key = createPrivateKey((APNS_KEY ?? '').replace(/\\n/g, '\n'));
	const signing = `${base64url(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID }))}.${base64url(
		JSON.stringify({ iss: APNS_TEAM_ID, iat: now })
	)}`;
	// JWS wants the raw r||s pair, not the DER structure `sign` produces by default.
	const signature = createSign('SHA256').update(signing).sign({ key, dsaEncoding: 'ieee-p1363' });

	provider = { jwt: `${signing}.${base64url(signature)}`, issuedAt: now };
	return provider.jwt;
}

function post(
	host: string,
	deviceToken: string,
	message: PushMessage
): Promise<{ status: number; reason: string | null }> {
	return new Promise((resolve, reject) => {
		const session = connect(host);
		const timer = setTimeout(() => {
			session.destroy();
			reject(new Error(`APNs did not answer within ${TIMEOUT_MS} ms`));
		}, TIMEOUT_MS);
		const settle = (run: () => void) => {
			clearTimeout(timer);
			session.close();
			run();
		};
		session.on('error', (cause) => settle(() => reject(cause)));

		const request = session.request({
			':method': 'POST',
			':path': `/3/device/${deviceToken}`,
			authorization: `bearer ${providerToken()}`,
			'apns-topic': BUNDLE_ID,
			'apns-push-type': 'alert',
			'apns-priority': '10',
			'content-type': 'application/json'
		});

		let status = 0;
		let body = '';
		request.on('response', (headers) => {
			status = Number(headers[':status'] ?? 0);
		});
		request.setEncoding('utf8');
		request.on('data', (chunk: string) => {
			body += chunk;
		});
		request.on('end', () =>
			settle(() => {
				let reason: string | null = null;
				try {
					reason = (JSON.parse(body || '{}') as { reason?: string }).reason ?? null;
				} catch {
					// A body that is not JSON carries no reason.
				}
				resolve({ status, reason });
			})
		);
		request.on('error', (cause) => settle(() => reject(cause)));

		request.end(
			JSON.stringify({
				aps: { alert: { title: message.title, body: message.body }, sound: 'default' },
				...message.data
			})
		);
	});
}

export async function sendPush(deviceToken: string, message: PushMessage): Promise<PushOutcome> {
	const hosts = APNS_HOST ? [APNS_HOST] : HOSTS;

	for (const host of hosts) {
		try {
			const { status, reason } = await post(host, deviceToken, message);
			if (status === 200) return 'sent';
			if (status === 410 || reason === 'Unregistered') return 'gone';
			// The other host's token: try the next one before giving up on it.
			if (status === 400 && reason === 'BadDeviceToken') continue;
			console.error(`APNs refused a push (${status} ${reason ?? 'no reason'}) on ${host}`);
			return 'failed';
		} catch (cause) {
			console.error(`APNs request to ${host} failed:`, cause);
			return 'failed';
		}
	}

	return 'gone';
}
