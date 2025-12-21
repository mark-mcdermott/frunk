// Product and variant types for the store
// Products are defined statically with Printful sync variant IDs

export interface ProductVariant {
	id: string;
	size: string;
	color: string;
	colorHex: string;
	printfulSyncVariantId: string; // Printful's sync variant ID for ordering
	inStock: boolean;
}

export interface Product {
	id: string;
	slug: string;
	name: string;
	shortName: string; // Short name for cart display (e.g., "T-Shirt")
	description: string;
	price: number; // in cents
	images: string[];
	colorImages?: Record<string, string>; // color -> front mockup URL
	colorBackImages?: Record<string, string>; // color -> back mockup URL
	category: 'tshirt' | 'hoodie' | 'mug' | 'sticker' | 'other';
	variants: ProductVariant[];
}

// Color hex values for Printful colors
const colorHexMap: Record<string, string> = {
	Black: '#1a1a1a',
	White: '#ffffff',
	Purple: '#6b21a8',
	'Dark Heather': '#4a4a4a',
	'Dark Heather Grey': '#5a5a5a',
	Sapphire: '#0f52ba',
	'Heather Red': '#c94c4c',
	Heliconia: '#e4287c',
	Charcoal: '#36454f',
	Orange: '#ff6b00',
	'Heather Indigo': '#4b5d67',
	'Jade Dome': '#00a86b',
	Daisy: '#f8de7e',
	'Navy Blazer': '#1f3044',
	Maroon: '#800000',
	'Team Red': '#c41e3a',
	Khaki: '#c3b091',
	'Team Gold': '#f2a900',
	Bone: '#e3dac9',
	'Alpine Green': '#4a7c59',
	'Classic Navy': '#1c2841',
	'Charcoal Heather': '#4a4a4a'
};

// Define your products here
export const products: Product[] = [
	{
		id: 'frunk-tshirt',
		slug: 'frunk-tshirt',
		name: 'Frunk T-Shirt',
		shortName: 'T-Shirt',
		description:
			'A comfortable, classic fit t-shirt featuring the Frunk robot. Small robot on front, large robot & logo on back.',
		price: 2000, // $20.00
		images: [
			'https://files.cdn.printful.com/files/a4f/a4f34f635e54dc5400d5dc65ad51b7b4_preview.png'
		],
		colorImages: {
			'Black': 'https://files.cdn.printful.com/files/ae1/ae16259e774f8486d44e754de36f7faf_preview.png',
			'Purple': 'https://files.cdn.printful.com/files/528/5280d783e68e7a8ad92d2ef55e72f0ed_preview.png',
			'Dark Heather': 'https://files.cdn.printful.com/files/f7c/f7cb57d57d5b5f50a60ffc8b9cf0a810_preview.png',
			'Dark Heather Grey': 'https://files.cdn.printful.com/files/810/810990c2fb00436a29769641828e5bbb_preview.png',
			'Sapphire': 'https://files.cdn.printful.com/files/b4e/b4ee655840a3c24603b482ad42256e9a_preview.png',
			'Heather Red': 'https://files.cdn.printful.com/files/39c/39c83305c7e85a36849ef29c74da42d1_preview.png',
			'Heliconia': 'https://files.cdn.printful.com/files/e64/e64eb392cab36891bc192e02d5e141df_preview.png',
			'Charcoal': 'https://files.cdn.printful.com/files/37e/37ef828d38cc9c68f3fcc68ed1569abc_preview.png',
			'Orange': 'https://files.cdn.printful.com/files/f8f/f8fb43e42b47974190cb02a4beee3fa1_preview.png',
			'Heather Indigo': 'https://files.cdn.printful.com/files/a30/a3054b229e5803892dd3a280ef7f21e3_preview.png',
			'Jade Dome': 'https://files.cdn.printful.com/files/ff6/ff6f9a0e0d352676747bb20c159b0771_preview.png',
			'Daisy': 'https://files.cdn.printful.com/files/2c9/2c938308c4400fa76e91a75318981af1_preview.png',
			'White': 'https://files.cdn.printful.com/files/e84/e840efbe46c89a5d04bd133bcbaf4021_preview.png'
		},
		colorBackImages: {
			'Black': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-black-back.png',
			'Charcoal': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-charcoal-back.png',
			'Daisy': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-daisy-back.png',
			'Dark Heather': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-dark-heather-back.png',
			'Dark Heather Grey': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-dark-heather-grey-back.png',
			'Heather Indigo': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-heather-indigo-back.png',
			'Heather Red': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-heather-red-back.png',
			'Heliconia': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-heliconia-back.png',
			'Jade Dome': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-jade-dome-back.png',
			'Orange': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-orange-back.png',
			'Purple': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-purple-back.png',
			'Sapphire': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-sapphire-back.png',
			'White': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/tshirt-white-back.png'
		},
		category: 'tshirt',
		variants: [
			// Black
			{ id: 'tshirt-s-black', size: 'S', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118120605', inStock: true },
			{ id: 'tshirt-m-black', size: 'M', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118120606', inStock: true },
			{ id: 'tshirt-l-black', size: 'L', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118120607', inStock: true },
			{ id: 'tshirt-xl-black', size: 'XL', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118120608', inStock: true },
			// Purple
			{ id: 'tshirt-s-purple', size: 'S', color: 'Purple', colorHex: '#6b21a8', printfulSyncVariantId: '5118120609', inStock: true },
			{ id: 'tshirt-m-purple', size: 'M', color: 'Purple', colorHex: '#6b21a8', printfulSyncVariantId: '5118120610', inStock: true },
			{ id: 'tshirt-l-purple', size: 'L', color: 'Purple', colorHex: '#6b21a8', printfulSyncVariantId: '5118120611', inStock: true },
			{ id: 'tshirt-xl-purple', size: 'XL', color: 'Purple', colorHex: '#6b21a8', printfulSyncVariantId: '5118120612', inStock: true },
			// Dark Heather
			{ id: 'tshirt-s-dark-heather', size: 'S', color: 'Dark Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118120613', inStock: true },
			{ id: 'tshirt-m-dark-heather', size: 'M', color: 'Dark Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118120614', inStock: true },
			{ id: 'tshirt-l-dark-heather', size: 'L', color: 'Dark Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118120615', inStock: true },
			{ id: 'tshirt-xl-dark-heather', size: 'XL', color: 'Dark Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118120616', inStock: true },
			// Dark Heather Grey
			{ id: 'tshirt-s-dark-heather-grey', size: 'S', color: 'Dark Heather Grey', colorHex: '#5a5a5a', printfulSyncVariantId: '5118120617', inStock: true },
			{ id: 'tshirt-m-dark-heather-grey', size: 'M', color: 'Dark Heather Grey', colorHex: '#5a5a5a', printfulSyncVariantId: '5118120618', inStock: true },
			{ id: 'tshirt-l-dark-heather-grey', size: 'L', color: 'Dark Heather Grey', colorHex: '#5a5a5a', printfulSyncVariantId: '5118120619', inStock: true },
			{ id: 'tshirt-xl-dark-heather-grey', size: 'XL', color: 'Dark Heather Grey', colorHex: '#5a5a5a', printfulSyncVariantId: '5118120620', inStock: true },
			// Sapphire
			{ id: 'tshirt-s-sapphire', size: 'S', color: 'Sapphire', colorHex: '#0f52ba', printfulSyncVariantId: '5118120621', inStock: true },
			{ id: 'tshirt-m-sapphire', size: 'M', color: 'Sapphire', colorHex: '#0f52ba', printfulSyncVariantId: '5118120622', inStock: true },
			{ id: 'tshirt-l-sapphire', size: 'L', color: 'Sapphire', colorHex: '#0f52ba', printfulSyncVariantId: '5118120623', inStock: true },
			{ id: 'tshirt-xl-sapphire', size: 'XL', color: 'Sapphire', colorHex: '#0f52ba', printfulSyncVariantId: '5118120624', inStock: true },
			// Heather Red
			{ id: 'tshirt-s-heather-red', size: 'S', color: 'Heather Red', colorHex: '#c94c4c', printfulSyncVariantId: '5118120625', inStock: true },
			{ id: 'tshirt-m-heather-red', size: 'M', color: 'Heather Red', colorHex: '#c94c4c', printfulSyncVariantId: '5118120626', inStock: true },
			{ id: 'tshirt-l-heather-red', size: 'L', color: 'Heather Red', colorHex: '#c94c4c', printfulSyncVariantId: '5118120627', inStock: true },
			{ id: 'tshirt-xl-heather-red', size: 'XL', color: 'Heather Red', colorHex: '#c94c4c', printfulSyncVariantId: '5118120628', inStock: true },
			// Heliconia
			{ id: 'tshirt-s-heliconia', size: 'S', color: 'Heliconia', colorHex: '#e4287c', printfulSyncVariantId: '5118120629', inStock: true },
			{ id: 'tshirt-m-heliconia', size: 'M', color: 'Heliconia', colorHex: '#e4287c', printfulSyncVariantId: '5118120630', inStock: true },
			{ id: 'tshirt-l-heliconia', size: 'L', color: 'Heliconia', colorHex: '#e4287c', printfulSyncVariantId: '5118120631', inStock: true },
			{ id: 'tshirt-xl-heliconia', size: 'XL', color: 'Heliconia', colorHex: '#e4287c', printfulSyncVariantId: '5118120632', inStock: true },
			// Charcoal
			{ id: 'tshirt-s-charcoal', size: 'S', color: 'Charcoal', colorHex: '#36454f', printfulSyncVariantId: '5118120633', inStock: true },
			{ id: 'tshirt-m-charcoal', size: 'M', color: 'Charcoal', colorHex: '#36454f', printfulSyncVariantId: '5118120634', inStock: true },
			{ id: 'tshirt-l-charcoal', size: 'L', color: 'Charcoal', colorHex: '#36454f', printfulSyncVariantId: '5118120635', inStock: true },
			{ id: 'tshirt-xl-charcoal', size: 'XL', color: 'Charcoal', colorHex: '#36454f', printfulSyncVariantId: '5118120636', inStock: true },
			// Orange
			{ id: 'tshirt-s-orange', size: 'S', color: 'Orange', colorHex: '#ff6b00', printfulSyncVariantId: '5118120637', inStock: true },
			{ id: 'tshirt-m-orange', size: 'M', color: 'Orange', colorHex: '#ff6b00', printfulSyncVariantId: '5118120638', inStock: true },
			{ id: 'tshirt-l-orange', size: 'L', color: 'Orange', colorHex: '#ff6b00', printfulSyncVariantId: '5118120639', inStock: true },
			{ id: 'tshirt-xl-orange', size: 'XL', color: 'Orange', colorHex: '#ff6b00', printfulSyncVariantId: '5118120640', inStock: true },
			// Heather Indigo
			{ id: 'tshirt-s-heather-indigo', size: 'S', color: 'Heather Indigo', colorHex: '#4b5d67', printfulSyncVariantId: '5118120641', inStock: true },
			{ id: 'tshirt-m-heather-indigo', size: 'M', color: 'Heather Indigo', colorHex: '#4b5d67', printfulSyncVariantId: '5118120642', inStock: true },
			{ id: 'tshirt-l-heather-indigo', size: 'L', color: 'Heather Indigo', colorHex: '#4b5d67', printfulSyncVariantId: '5118120643', inStock: true },
			{ id: 'tshirt-xl-heather-indigo', size: 'XL', color: 'Heather Indigo', colorHex: '#4b5d67', printfulSyncVariantId: '5118120644', inStock: true },
			// Jade Dome
			{ id: 'tshirt-s-jade-dome', size: 'S', color: 'Jade Dome', colorHex: '#00a86b', printfulSyncVariantId: '5118120645', inStock: true },
			{ id: 'tshirt-m-jade-dome', size: 'M', color: 'Jade Dome', colorHex: '#00a86b', printfulSyncVariantId: '5118120646', inStock: true },
			{ id: 'tshirt-l-jade-dome', size: 'L', color: 'Jade Dome', colorHex: '#00a86b', printfulSyncVariantId: '5118120647', inStock: true },
			{ id: 'tshirt-xl-jade-dome', size: 'XL', color: 'Jade Dome', colorHex: '#00a86b', printfulSyncVariantId: '5118120648', inStock: true },
			// Daisy
			{ id: 'tshirt-s-daisy', size: 'S', color: 'Daisy', colorHex: '#f8de7e', printfulSyncVariantId: '5118120649', inStock: true },
			{ id: 'tshirt-m-daisy', size: 'M', color: 'Daisy', colorHex: '#f8de7e', printfulSyncVariantId: '5118120650', inStock: true },
			{ id: 'tshirt-l-daisy', size: 'L', color: 'Daisy', colorHex: '#f8de7e', printfulSyncVariantId: '5118120651', inStock: true },
			{ id: 'tshirt-xl-daisy', size: 'XL', color: 'Daisy', colorHex: '#f8de7e', printfulSyncVariantId: '5118120652', inStock: true },
			// White
			{ id: 'tshirt-s-white', size: 'S', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118120653', inStock: true },
			{ id: 'tshirt-m-white', size: 'M', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118120654', inStock: true },
			{ id: 'tshirt-l-white', size: 'L', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118120655', inStock: true },
			{ id: 'tshirt-xl-white', size: 'XL', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118120656', inStock: true }
		]
	},
	{
		id: 'frunk-hoodie',
		slug: 'frunk-hoodie',
		name: 'Frunk Hoodie',
		shortName: 'Hoodie',
		description:
			'A cozy premium hoodie featuring the Frunk robot. Small robot on front, large robot & logo on back.',
		price: 4000, // $40.00
		images: [
			'https://files.cdn.printful.com/files/526/52698166e5e208c6c867df20cc3199bd_preview.png'
		],
		colorImages: {
			'Black': 'https://files.cdn.printful.com/files/526/52698166e5e208c6c867df20cc3199bd_preview.png',
			'Navy Blazer': 'https://files.cdn.printful.com/files/e3a/e3a7a67c4140663148b4e4a8e3165c49_preview.png',
			'Maroon': 'https://files.cdn.printful.com/files/bee/bee0ec1ef59dddabd54c82e016808846_preview.png',
			'Team Red': 'https://files.cdn.printful.com/files/55d/55d1cb95bfc1239573af54075c9e296b_preview.png',
			'Khaki': 'https://files.cdn.printful.com/files/5ec/5ecf90a157de7757c8365ef5e069e203_preview.png',
			'Team Gold': 'https://files.cdn.printful.com/files/d8f/d8f42898a941a9d03984579f3e241d19_preview.png',
			'Bone': 'https://files.cdn.printful.com/files/819/819294b711b27b185ac82a9be6b82e6b_preview.png',
			'White': 'https://files.cdn.printful.com/files/140/1408c1642d20a28fae6504c20ce75ede_preview.png'
		},
		colorBackImages: {
			'Black': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-black-back.png',
			'Bone': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-bone-back.png',
			'Khaki': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-khaki-back.png',
			'Maroon': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-maroon-back.png',
			'Navy Blazer': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-navy-blazer-back.png',
			'Team Gold': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-team-gold-back.png',
			'Team Red': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-team-red-back.png',
			'White': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/hoodie-white-back.png'
		},
		category: 'hoodie',
		variants: [
			// Black
			{ id: 'hoodie-s-black', size: 'S', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118124249', inStock: true },
			{ id: 'hoodie-m-black', size: 'M', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118124250', inStock: true },
			{ id: 'hoodie-l-black', size: 'L', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118124251', inStock: true },
			{ id: 'hoodie-xl-black', size: 'XL', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118124252', inStock: true },
			// Navy Blazer
			{ id: 'hoodie-s-navy-blazer', size: 'S', color: 'Navy Blazer', colorHex: '#1f3044', printfulSyncVariantId: '5118124253', inStock: true },
			{ id: 'hoodie-m-navy-blazer', size: 'M', color: 'Navy Blazer', colorHex: '#1f3044', printfulSyncVariantId: '5118124254', inStock: true },
			{ id: 'hoodie-l-navy-blazer', size: 'L', color: 'Navy Blazer', colorHex: '#1f3044', printfulSyncVariantId: '5118124255', inStock: true },
			{ id: 'hoodie-xl-navy-blazer', size: 'XL', color: 'Navy Blazer', colorHex: '#1f3044', printfulSyncVariantId: '5118124256', inStock: true },
			// Maroon
			{ id: 'hoodie-s-maroon', size: 'S', color: 'Maroon', colorHex: '#800000', printfulSyncVariantId: '5118124257', inStock: true },
			{ id: 'hoodie-m-maroon', size: 'M', color: 'Maroon', colorHex: '#800000', printfulSyncVariantId: '5118124258', inStock: true },
			{ id: 'hoodie-l-maroon', size: 'L', color: 'Maroon', colorHex: '#800000', printfulSyncVariantId: '5118124259', inStock: true },
			{ id: 'hoodie-xl-maroon', size: 'XL', color: 'Maroon', colorHex: '#800000', printfulSyncVariantId: '5118124260', inStock: true },
			// Team Red
			{ id: 'hoodie-s-team-red', size: 'S', color: 'Team Red', colorHex: '#c41e3a', printfulSyncVariantId: '5118124261', inStock: true },
			{ id: 'hoodie-m-team-red', size: 'M', color: 'Team Red', colorHex: '#c41e3a', printfulSyncVariantId: '5118124262', inStock: true },
			{ id: 'hoodie-l-team-red', size: 'L', color: 'Team Red', colorHex: '#c41e3a', printfulSyncVariantId: '5118124263', inStock: true },
			{ id: 'hoodie-xl-team-red', size: 'XL', color: 'Team Red', colorHex: '#c41e3a', printfulSyncVariantId: '5118124264', inStock: true },
			// Khaki
			{ id: 'hoodie-s-khaki', size: 'S', color: 'Khaki', colorHex: '#c3b091', printfulSyncVariantId: '5118124265', inStock: true },
			{ id: 'hoodie-m-khaki', size: 'M', color: 'Khaki', colorHex: '#c3b091', printfulSyncVariantId: '5118124266', inStock: true },
			{ id: 'hoodie-l-khaki', size: 'L', color: 'Khaki', colorHex: '#c3b091', printfulSyncVariantId: '5118124267', inStock: true },
			{ id: 'hoodie-xl-khaki', size: 'XL', color: 'Khaki', colorHex: '#c3b091', printfulSyncVariantId: '5118124268', inStock: true },
			// Team Gold
			{ id: 'hoodie-s-team-gold', size: 'S', color: 'Team Gold', colorHex: '#f2a900', printfulSyncVariantId: '5118124269', inStock: true },
			{ id: 'hoodie-m-team-gold', size: 'M', color: 'Team Gold', colorHex: '#f2a900', printfulSyncVariantId: '5118124270', inStock: true },
			{ id: 'hoodie-l-team-gold', size: 'L', color: 'Team Gold', colorHex: '#f2a900', printfulSyncVariantId: '5118124271', inStock: true },
			{ id: 'hoodie-xl-team-gold', size: 'XL', color: 'Team Gold', colorHex: '#f2a900', printfulSyncVariantId: '5118124272', inStock: true },
			// Bone
			{ id: 'hoodie-s-bone', size: 'S', color: 'Bone', colorHex: '#e3dac9', printfulSyncVariantId: '5118124273', inStock: true },
			{ id: 'hoodie-m-bone', size: 'M', color: 'Bone', colorHex: '#e3dac9', printfulSyncVariantId: '5118124274', inStock: true },
			{ id: 'hoodie-l-bone', size: 'L', color: 'Bone', colorHex: '#e3dac9', printfulSyncVariantId: '5118124275', inStock: true },
			{ id: 'hoodie-xl-bone', size: 'XL', color: 'Bone', colorHex: '#e3dac9', printfulSyncVariantId: '5118124276', inStock: true },
			// White
			{ id: 'hoodie-s-white', size: 'S', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118124277', inStock: true },
			{ id: 'hoodie-m-white', size: 'M', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118124278', inStock: true },
			{ id: 'hoodie-l-white', size: 'L', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118124279', inStock: true },
			{ id: 'hoodie-xl-white', size: 'XL', color: 'White', colorHex: '#ffffff', printfulSyncVariantId: '5118124280', inStock: true }
		]
	},
	{
		id: 'frunk-zip-hoodie',
		slug: 'frunk-zip-hoodie',
		name: 'Frunk Zip Hoodie',
		shortName: 'Zip Hoodie',
		description:
			'A premium fleece zip-up hoodie featuring the Frunk robot. Small robot on front, large robot & logo on back.',
		price: 5000, // $50.00
		images: [
			'https://files.cdn.printful.com/files/016/0162830c39053c7fcfefe882a18a1257_preview.png'
		],
		colorImages: {
			'Alpine Green': 'https://files.cdn.printful.com/files/016/0162830c39053c7fcfefe882a18a1257_preview.png',
			'Black': 'https://files.cdn.printful.com/files/85d/85dc9feb10d9417276a0889564f2c3c6_preview.png',
			'Classic Navy': 'https://files.cdn.printful.com/files/604/604cb1351f4c3aff4b4811a0d2f87709_preview.png',
			'Charcoal Heather': 'https://files.cdn.printful.com/files/5e1/5e11ac80d9db8a20d6e823897ac09f1d_preview.png'
		},
		colorBackImages: {
			'Alpine Green': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/zip-hoodie-alpine-green-back.png',
			'Black': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/zip-hoodie-black-back.png',
			'Charcoal Heather': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/zip-hoodie-charcoal-heather-back.png',
			'Classic Navy': 'https://pub-9903686a35b440c6b73f8b917ba808c8.r2.dev/back-mockups/zip-hoodie-classic-navy-back.png'
		},
		category: 'hoodie',
		variants: [
			// Alpine Green
			{ id: 'zip-hoodie-s-alpine-green', size: 'S', color: 'Alpine Green', colorHex: '#4a7c59', printfulSyncVariantId: '5118125772', inStock: true },
			{ id: 'zip-hoodie-m-alpine-green', size: 'M', color: 'Alpine Green', colorHex: '#4a7c59', printfulSyncVariantId: '5118125773', inStock: true },
			{ id: 'zip-hoodie-l-alpine-green', size: 'L', color: 'Alpine Green', colorHex: '#4a7c59', printfulSyncVariantId: '5118125774', inStock: true },
			{ id: 'zip-hoodie-xl-alpine-green', size: 'XL', color: 'Alpine Green', colorHex: '#4a7c59', printfulSyncVariantId: '5118125775', inStock: true },
			// Black
			{ id: 'zip-hoodie-s-black', size: 'S', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118141601', inStock: true },
			{ id: 'zip-hoodie-m-black', size: 'M', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118141602', inStock: true },
			{ id: 'zip-hoodie-l-black', size: 'L', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118141603', inStock: true },
			{ id: 'zip-hoodie-xl-black', size: 'XL', color: 'Black', colorHex: '#1a1a1a', printfulSyncVariantId: '5118141604', inStock: true },
			// Classic Navy
			{ id: 'zip-hoodie-s-classic-navy', size: 'S', color: 'Classic Navy', colorHex: '#1c2841', printfulSyncVariantId: '5118141605', inStock: true },
			{ id: 'zip-hoodie-m-classic-navy', size: 'M', color: 'Classic Navy', colorHex: '#1c2841', printfulSyncVariantId: '5118141606', inStock: true },
			{ id: 'zip-hoodie-l-classic-navy', size: 'L', color: 'Classic Navy', colorHex: '#1c2841', printfulSyncVariantId: '5118141607', inStock: true },
			{ id: 'zip-hoodie-xl-classic-navy', size: 'XL', color: 'Classic Navy', colorHex: '#1c2841', printfulSyncVariantId: '5118141608', inStock: true },
			// Charcoal Heather
			{ id: 'zip-hoodie-s-charcoal-heather', size: 'S', color: 'Charcoal Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118141609', inStock: true },
			{ id: 'zip-hoodie-m-charcoal-heather', size: 'M', color: 'Charcoal Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118141610', inStock: true },
			{ id: 'zip-hoodie-l-charcoal-heather', size: 'L', color: 'Charcoal Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118141611', inStock: true },
			{ id: 'zip-hoodie-xl-charcoal-heather', size: 'XL', color: 'Charcoal Heather', colorHex: '#4a4a4a', printfulSyncVariantId: '5118141612', inStock: true }
		]
	}
];

// Helper functions
export function getProduct(slug: string): Product | undefined {
	return products.find((p) => p.slug === slug);
}

export function getProductById(id: string): Product | undefined {
	return products.find((p) => p.id === id);
}

export function getProductVariant(productId: string, variantId: string): ProductVariant | undefined {
	const product = products.find((p) => p.id === productId);
	return product?.variants.find((v) => v.id === variantId);
}

export function getAvailableSizes(product: Product): string[] {
	const sizeOrder = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
	const sizes = [...new Set(product.variants.filter((v) => v.inStock).map((v) => v.size))];
	return sizes.sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
}

export function getAvailableColors(product: Product): { color: string; hex: string }[] {
	const colors = new Map<string, string>();
	product.variants.filter((v) => v.inStock).forEach((v) => colors.set(v.color, v.colorHex));
	return Array.from(colors.entries()).map(([color, hex]) => ({ color, hex }));
}

export function getVariantByOptions(
	product: Product,
	size: string,
	color: string
): ProductVariant | undefined {
	return product.variants.find((v) => v.size === size && v.color === color && v.inStock);
}

export function formatPrice(cents: number): string {
	return `$${(cents / 100).toFixed(2)}`;
}
