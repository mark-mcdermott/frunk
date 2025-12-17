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
	description: string;
	price: number; // in cents
	images: string[];
	category: 'tshirt' | 'hoodie' | 'mug' | 'sticker' | 'other';
	variants: ProductVariant[];
}

// Define your products here
// After setting up Printful sync products, add your printfulSyncVariantId values
export const products: Product[] = [
	{
		id: 'classic-tee',
		slug: 'classic-tee',
		name: 'Classic T-Shirt',
		description: 'A comfortable, classic fit t-shirt. Perfect for everyday wear.',
		price: 2500, // $25.00
		images: ['/products/classic-tee.png'],
		category: 'tshirt',
		variants: [
			// Add your Printful sync variant IDs here
			{
				id: 'classic-tee-s-white',
				size: 'S',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'classic-tee-m-white',
				size: 'M',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'classic-tee-l-white',
				size: 'L',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'classic-tee-xl-white',
				size: 'XL',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'classic-tee-s-black',
				size: 'S',
				color: 'Black',
				colorHex: '#1a1a1a',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'classic-tee-m-black',
				size: 'M',
				color: 'Black',
				colorHex: '#1a1a1a',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'classic-tee-l-black',
				size: 'L',
				color: 'Black',
				colorHex: '#1a1a1a',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'classic-tee-xl-black',
				size: 'XL',
				color: 'Black',
				colorHex: '#1a1a1a',
				printfulSyncVariantId: '',
				inStock: true
			}
		]
	},
	{
		id: 'premium-hoodie',
		slug: 'premium-hoodie',
		name: 'Premium Hoodie',
		description: 'A cozy premium hoodie. Perfect for cooler weather.',
		price: 4500, // $45.00
		images: ['/products/premium-hoodie.png'],
		category: 'hoodie',
		variants: [
			{
				id: 'premium-hoodie-s-white',
				size: 'S',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'premium-hoodie-m-white',
				size: 'M',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'premium-hoodie-l-white',
				size: 'L',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			},
			{
				id: 'premium-hoodie-xl-white',
				size: 'XL',
				color: 'White',
				colorHex: '#ffffff',
				printfulSyncVariantId: '',
				inStock: true
			}
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
	return [...new Set(product.variants.filter((v) => v.inStock).map((v) => v.size))];
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
