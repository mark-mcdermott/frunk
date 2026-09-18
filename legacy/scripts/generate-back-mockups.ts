/**
 * Generate back mockups for all products using Printful's Mockup Generator API
 * and upload them to Cloudflare R2.
 *
 * Usage: npx tsx scripts/generate-back-mockups.ts
 */

const PRINTFUL_API_KEY = 't6qqtBBed4fVxJCWDxaGF397JkCRTO7dG2maEutq';
const STORE_ID = '17418567';

// Back design image URL (same for all products)
const BACK_DESIGN_URL = 'https://files.cdn.printful.com/files/e7a/e7a30d14334f5791750e38b9268954df_preview.png';

// Product configurations
const products = [
	{
		name: 'tshirt',
		productId: 12,
		variants: [
			{ color: 'Black', variantId: 474 },
			{ color: 'Charcoal', variantId: 479 },
			{ color: 'Daisy', variantId: 22287 },
			{ color: 'Dark Heather', variantId: 483 },
			{ color: 'Dark Heather Grey', variantId: 22352 },
			{ color: 'Heather Indigo', variantId: 21615 },
			{ color: 'Heather Red', variantId: 20416 },
			{ color: 'Heliconia', variantId: 23472 },
			{ color: 'Jade Dome', variantId: 23473 },
			{ color: 'Orange', variantId: 497 },
			{ color: 'Purple', variantId: 498 },
			{ color: 'Sapphire', variantId: 22293 },
			{ color: 'White', variantId: 473 }
		]
	},
	{
		name: 'hoodie',
		productId: 380,
		variants: [
			{ color: 'Black', variantId: 10779 },
			{ color: 'Bone', variantId: 20284 },
			{ color: 'Khaki', variantId: 13899 },
			{ color: 'Maroon', variantId: 11486 },
			{ color: 'Navy Blazer', variantId: 11491 },
			{ color: 'Team Gold', variantId: 24999 },
			{ color: 'Team Red', variantId: 20278 },
			{ color: 'White', variantId: 10774 }
		]
	},
	{
		name: 'zip-hoodie',
		productId: 584,
		variants: [
			{ color: 'Alpine Green', variantId: 15033 },
			{ color: 'Black', variantId: 15038 },
			{ color: 'Charcoal Heather', variantId: 15043 },
			{ color: 'Classic Navy', variantId: 15053 }
		]
	}
];

interface MockupTask {
	task_key: string;
	status: string;
}

interface MockupResult {
	task_key: string;
	status: string;
	mockups?: Array<{
		placement: string;
		variant_ids: number[];
		mockup_url: string;
	}>;
}

async function createMockupTask(productId: number, variantId: number): Promise<string> {
	const response = await fetch(
		`https://api.printful.com/mockup-generator/create-task/${productId}`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${PRINTFUL_API_KEY}`,
				'X-PF-Store-Id': STORE_ID,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				variant_ids: [variantId],
				files: [
					{
						placement: 'back',
						image_url: BACK_DESIGN_URL,
						position: {
							area_width: 1800,
							area_height: 2400,
							width: 1800,
							height: 1667,
							top: 366,
							left: 0
						}
					}
				],
				format: 'png'
			})
		}
	);

	const data = await response.json();
	if (data.code !== 200) {
		throw new Error(`Failed to create task: ${JSON.stringify(data)}`);
	}

	return data.result.task_key;
}

async function waitForTask(taskKey: string, maxAttempts = 30): Promise<MockupResult> {
	for (let i = 0; i < maxAttempts; i++) {
		const response = await fetch(
			`https://api.printful.com/mockup-generator/task?task_key=${taskKey}`,
			{
				headers: {
					Authorization: `Bearer ${PRINTFUL_API_KEY}`,
					'X-PF-Store-Id': STORE_ID
				}
			}
		);

		const data = await response.json();
		if (data.code !== 200) {
			throw new Error(`Failed to get task: ${JSON.stringify(data)}`);
		}

		if (data.result.status === 'completed') {
			return data.result;
		}

		if (data.result.status === 'failed') {
			throw new Error(`Task failed: ${JSON.stringify(data)}`);
		}

		// Wait 2 seconds before checking again
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}

	throw new Error(`Task timed out: ${taskKey}`);
}

async function generateBackMockups() {
	const results: Record<string, Record<string, string>> = {};

	for (const product of products) {
		console.log(`\nProcessing ${product.name}...`);
		results[product.name] = {};

		for (const variant of product.variants) {
			console.log(`  Generating back mockup for ${variant.color}...`);

			try {
				// Create mockup task
				const taskKey = await createMockupTask(product.productId, variant.variantId);
				console.log(`    Task created: ${taskKey}`);

				// Wait for completion
				const result = await waitForTask(taskKey);

				if (result.mockups && result.mockups.length > 0) {
					const mockupUrl = result.mockups[0].mockup_url;
					results[product.name][variant.color] = mockupUrl;
					console.log(`    ✓ Generated: ${mockupUrl.substring(0, 80)}...`);
				}
			} catch (error) {
				console.error(`    ✗ Failed: ${error}`);
			}

			// Rate limit: wait 60 seconds between requests to avoid 429
			console.log('    Waiting 60s for rate limit...');
			await new Promise((resolve) => setTimeout(resolve, 60000));
		}
	}

	// Output results as JSON for updating products.ts
	console.log('\n\n=== BACK MOCKUP URLs ===\n');
	console.log(JSON.stringify(results, null, 2));

	// Output as TypeScript format for easy copy-paste
	console.log('\n\n=== TypeScript Format ===\n');
	for (const [productName, colors] of Object.entries(results)) {
		console.log(`// ${productName} backImages:`);
		console.log('colorBackImages: {');
		for (const [color, url] of Object.entries(colors)) {
			console.log(`  '${color}': '${url}',`);
		}
		console.log('},\n');
	}
}

generateBackMockups().catch(console.error);
