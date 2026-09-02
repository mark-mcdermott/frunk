/**
 * Download back mockups from temporary Printful URLs and upload to Cloudflare R2
 *
 * Usage: npx tsx scripts/upload-back-mockups-to-r2.ts
 *
 * After running, update products.ts with the new R2 URLs
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BUCKET_NAME = 'frunk-merch';

// Back mockup URLs from Printful (temporary)
const backMockups = {
	tshirt: {
		'Black': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/205d01506ca01e00b754054c85e2d2fd/unisex-basic-softstyle-t-shirt-black-back-6947b369a4ded.png',
		'Charcoal': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/243aa100ae825773c84c99467267d1ef/unisex-basic-softstyle-t-shirt-charcoal-back-6947b3aabb05e.png',
		'Daisy': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/67700603e2235ee78a1524b854b8f0f6/unisex-basic-softstyle-t-shirt-daisy-back-6947b3eb99965.png',
		'Dark Heather': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/801be17d6b1ecee672e45704814f6965/unisex-basic-softstyle-t-shirt-dark-heather-back-6947b42ca399f.png',
		'Dark Heather Grey': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/70248afdb2f3ac5ee8bbd3affa2a381c/unisex-basic-softstyle-t-shirt-dark-heather-grey-back-6947b46ddb929.png',
		'Heather Indigo': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/70a7ff48e976aa15f68195966f1edc02/unisex-basic-softstyle-t-shirt-heather-indigo-back-6947b4af58abe.png',
		'Heather Red': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/cbc9530065195e9062f6afcb794d1e22/unisex-basic-softstyle-t-shirt-heather-red-back-6947b4f1cb967.png',
		'Heliconia': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/b3c65efaf44d6749cfae4be50af43990/unisex-basic-softstyle-t-shirt-heliconia-back-6947b5334318a.png',
		'Jade Dome': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/b608a01fd77974d76f52c9e22b981f92/unisex-basic-softstyle-t-shirt-jade-dome-back-6947b574a7f47.png',
		'Orange': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/ed7b470722a533e80e8ab8eda1ed022f/unisex-basic-softstyle-t-shirt-orange-back-6947b5b653b98.png',
		'Purple': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/5ece2083f0bf1c6d9777779dd257fbc2/unisex-basic-softstyle-t-shirt-purple-back-6947b5f8e5e53.png',
		'Sapphire': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/3b3a86003c5885cce7edba02a500689b/unisex-basic-softstyle-t-shirt-sapphire-back-6947b63a03bcf.png',
		'White': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/83dd028b1921bfd5cbdfe1f2de089554/unisex-basic-softstyle-t-shirt-white-back-6947b67ae7112.png'
	},
	hoodie: {
		'Black': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/97237342c95fa1ac7b20a62188802571/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-black-back-6947b6bc2e43a.png',
		'Bone': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/c6e79440181382eac20325c946eae55c/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-bone-back-6947b6ff951dc.png',
		'Khaki': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/f6ead313e928c65874c58798b1fcbddd/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-khaki-back-6947b740977cd.png',
		'Maroon': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/6c1d62641858eb6d28feec69abca7857/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-maroon-back-6947b78260cd3.png',
		'Navy Blazer': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/0b6152408340641d411b68e885e4f45a/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-navy-blazer-back-6947b7c52d7d1.png',
		'Team Gold': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/89b8e27ddd86f6c4d68ffb911fd4dc4e/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-team-gold-back-6947b80835b34.png',
		'Team Red': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/2278711db78e3436819a6bb952a4dab6/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-team-red-back-6947b849657ea.png',
		'White': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/29cc6ee4521d523a5fbdcd0fdc5d7fe8/cotton-heritage-m2580-i-unisex-premium-pullover-hoodie-white-back-6947b88ccdba7.png'
	},
	'zip-hoodie': {
		'Alpine Green': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/753cabdb8a5a17a8df27064e6e932aa4/unisex-fleece-zip-up-hoodie-alpine-green-back-6947b8cd6d81b.png',
		'Black': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/e1905f1169a71e09cce3c27cc17fd5ca/unisex-fleece-zip-up-hoodie-black-back-6947b911aebb1.png',
		'Charcoal Heather': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/8ffa44f2bdca9a9d25b666a050ce514a/unisex-fleece-zip-up-hoodie-charcoal-heather-back-6947b953e37e1.png',
		'Classic Navy': 'https://printful-upload.s3-accelerate.amazonaws.com/tmp/c6e0e07f86356555fe111454b4d49e6c/unisex-fleece-zip-up-hoodie-classic-navy-back-6947b99746761.png'
	}
};

// Slugify color name for filename
function slugify(str: string): string {
	return str.toLowerCase().replace(/\s+/g, '-');
}

async function downloadAndUpload() {
	const tmpDir = '/tmp/frunk-mockups';

	// Create temp directory
	if (!existsSync(tmpDir)) {
		mkdirSync(tmpDir, { recursive: true });
	}

	const results: Record<string, Record<string, string>> = {};

	for (const [productType, colors] of Object.entries(backMockups)) {
		console.log(`\nProcessing ${productType}...`);
		results[productType] = {};

		for (const [color, url] of Object.entries(colors)) {
			const colorSlug = slugify(color);
			const filename = `${productType}-${colorSlug}-back.png`;
			const localPath = join(tmpDir, filename);
			const r2Key = `back-mockups/${filename}`;

			console.log(`  Downloading ${color}...`);

			try {
				// Download the image
				const response = await fetch(url);
				if (!response.ok) {
					console.error(`    Failed to download: ${response.status}`);
					continue;
				}

				const buffer = Buffer.from(await response.arrayBuffer());
				writeFileSync(localPath, buffer);

				console.log(`  Uploading to R2...`);

				// Upload to R2 (remote)
				execSync(`npx wrangler r2 object put ${BUCKET_NAME}/${r2Key} --file="${localPath}" --content-type="image/png" --remote`, {
					stdio: 'pipe'
				});

				// Store the R2 URL (will need public access configured)
				results[productType][color] = r2Key;
				console.log(`    ✓ Uploaded: ${r2Key}`);

				// Clean up local file
				unlinkSync(localPath);
			} catch (error) {
				console.error(`    ✗ Failed: ${error}`);
			}
		}
	}

	console.log('\n\n=== R2 Keys (need to configure public URL) ===\n');
	console.log(JSON.stringify(results, null, 2));

	console.log('\n\n=== Next Steps ===');
	console.log('1. Enable public access on the frunk-merch bucket in Cloudflare dashboard');
	console.log('2. Or set up a custom domain for the bucket');
	console.log('3. Update products.ts with the public URLs');
}

downloadAndUpload().catch(console.error);
