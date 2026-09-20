// @ts-check
import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Lint for the Astro app. `legacy/` keeps its own config and is not linted here — it
 * is the reference for the port, not part of it.
 *
 * Formatting is Prettier's job; `eslint-config-prettier` goes last so no rule here
 * argues with it. Type-aware rules are deliberately off: `astro check` already
 * typechecks everything, and running typescript-eslint with type information doubles
 * the wall-clock for findings the compiler mostly makes first.
 */
export default tseslint.config(
	{
		ignores: [
			'legacy/**',
			// Worktrees that background sessions leave behind carry a whole second copy.
			'.claude/**',
			'android/**',
			'ios/**',
			'src-tauri/**',
			'.svelte-kit/**',
			'.vercel/**',
			'.astro/**',
			'dist/**',
			'drizzle/**',
			'test-results/**',
			'playwright-report/**',
			'public/**',
			// Untracked Phase 3 verification scripts for the hand-rolled WebAuthn flow that
			// Better Auth replaced; gitignored, and not worth keeping current.
			'.llm/**'
		]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	...astro.configs['flat/recommended'],
	{
		files: ['**/*.{ts,tsx,js,mjs}'],
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// Unused parameters are legitimate when prefixed — `_vehicle` in a destructure.
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
			],
			// `unknown` is the house answer; `any` is banned outright (CLAUDE.md).
			'@typescript-eslint/no-explicit-any': 'error'
		}
	},
	{
		files: ['**/*.tsx'],
		plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
		rules: {
			...reactHooks.configs.flat.recommended.rules,
			...jsxA11y.flatConfigs.recommended.rules,
			/*
			 * An error since 2026-09-20. Every form page used to seed its state from the loaded
			 * row inside an effect; each is now a loader that renders a form keyed on the row,
			 * seeded at mount. Reach for that pattern, not for an effect.
			 */
			'react-hooks/set-state-in-effect': 'error',
			// Label text may sit two elements deep — the role checkboxes carry a name
			// line and a hint line inside one wrapping span. Depth 3 sees through that.
			'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }]
		}
	},
	{
		// shadcn's generated primitives are kept unedited so they survive being re-added.
		// `Label` is a thin wrapper; whether it is associated with a control is decided
		// at each call site, which the rule cannot see from here.
		files: ['src/components/ui/**'],
		rules: { 'jsx-a11y/label-has-associated-control': 'off' }
	},
	prettier
);
