/**
 * Selector for elements that handle their own clicks.
 */
const INTERACTIVE_SELECTOR = 'a, button, form';

/**
 * True when an event originated inside an interactive element, so that
 * row and card click handlers can defer to the control the user clicked.
 */
export function isInteractiveTarget(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}
