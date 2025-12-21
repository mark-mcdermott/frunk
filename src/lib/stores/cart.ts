import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export interface CartItem {
	productId: string;
	variantId: string;
	quantity: number;
	name: string;
	shortName: string; // T-Shirt, Hoodie, Zip Hoodie
	size: string;
	color: string;
	price: number; // in cents
	image: string;
}

const STORAGE_KEY = 'frunk-cart';

function createCartStore() {
	// Initialize from localStorage if in browser
	const initialItems: CartItem[] = browser
		? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
		: [];

	const { subscribe, set, update } = writable<CartItem[]>(initialItems);

	// Sync to localStorage on changes
	if (browser) {
		subscribe((items) => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
		});
	}

	return {
		subscribe,

		addItem: (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
			update((items) => {
				const existingIndex = items.findIndex(
					(i) => i.productId === item.productId && i.variantId === item.variantId
				);

				if (existingIndex >= 0) {
					// Update quantity of existing item
					const updated = [...items];
					updated[existingIndex] = {
						...updated[existingIndex],
						quantity: updated[existingIndex].quantity + quantity
					};
					return updated;
				}

				// Add new item
				return [...items, { ...item, quantity }];
			});
		},

		removeItem: (productId: string, variantId: string) => {
			update((items) => items.filter((i) => !(i.productId === productId && i.variantId === variantId)));
		},

		updateQuantity: (productId: string, variantId: string, quantity: number) => {
			if (quantity <= 0) {
				update((items) => items.filter((i) => !(i.productId === productId && i.variantId === variantId)));
				return;
			}

			update((items) =>
				items.map((i) =>
					i.productId === productId && i.variantId === variantId ? { ...i, quantity } : i
				)
			);
		},

		clear: () => set([]),

		getItems: () => get({ subscribe })
	};
}

export const cart = createCartStore();

// Derived stores for computed values
export const cartItemCount = derived(cart, ($cart) =>
	$cart.reduce((sum, item) => sum + item.quantity, 0)
);

export const cartSubtotal = derived(cart, ($cart) =>
	$cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

// Cart drawer open state
export const isCartOpen = writable(false);

export function openCart() {
	isCartOpen.set(true);
}

export function closeCart() {
	isCartOpen.set(false);
}

export function toggleCart() {
	isCartOpen.update((open) => !open);
}
