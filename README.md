# Frunk

[![E2E Tests](https://github.com/mark-mcdermott/frunk/actions/workflows/e2e.yml/badge.svg)](https://github.com/mark-mcdermott/frunk/actions/workflows/e2e.yml)

Your personal vehicle management companion. Keep track of everything about your cars in one place.

## What is Frunk?

Frunk is a modern vehicle management application designed for car enthusiasts and everyday drivers alike. Whether you own one car or a whole collection, Frunk helps you stay organized and on top of maintenance.

The name "Frunk" comes from "front trunk" - the storage compartment found in electric vehicles and some sports cars. Just like a frunk stores your essentials, our app stores everything important about your vehicles.

## Features

- **Vehicle Profiles** - Store details about all your vehicles including make, model, year, VIN, and photos
- **Repair Tracking** - Log maintenance and repairs with dates, costs, mileage, and vendor information
- **Vendor Management** - Track repair shops and service providers
- **Notes** - Attach notes to vehicles for easy reference
- **Photo Galleries** - Create galleries to showcase your vehicles with organized photo collections
- **Merch Store** - Built-in e-commerce with Stripe payments and Printful print-on-demand fulfillment
- **Demo Mode** - Try the app with pre-populated sample data before creating an account

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5 (with runes), TypeScript
- **Styling**: Tailwind CSS 4, Skeleton UI
- **Database**: Neon (serverless PostgreSQL), Drizzle ORM
- **Auth**: Custom session-based auth with AWS SES for verification emails
- **Payments**: Stripe Checkout
- **Fulfillment**: Printful print-on-demand
- **Storage**: Cloudflare R2
- **Hosting**: Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (Neon recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/mark-mcdermott/frunk.git
cd frunk

# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file with:

```bash
# Database
DATABASE_URL="postgresql://..."

# AWS SES sender (optional, defaults to noreply@frunk.cloud)
SES_FROM_EMAIL="noreply@frunk.cloud"

# AWS SES (for emails)
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"

# Stripe (for payments)
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Printful (for merch fulfillment)
PRINTFUL_API_KEY="..."

# Cloudflare R2 (for file storage)
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_ACCOUNT_ID="..."
```

### Database Setup

```bash
# Push schema to database
pnpm db:push

# Seed with sample data (optional)
pnpm db:seed-office
```

### Development

```bash
# Start dev server
pnpm dev

# Start dev server and open browser
pnpm dev --open
```

### Building

```bash
# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

### Testing

```bash
# Run all tests
pnpm test

# Run individual suites
pnpm test:auth        # Sign up/in, profile, sign out, protected routes
pnpm test:nav         # Page loads, accessibility, link checks
pnpm test:demo        # Demo mode flows
pnpm test:crud        # Vehicles, vendors, repairs & notes CRUD
pnpm test:merch-ui    # Merch store browsing

# Aliases
pnpm test:core-flows  # auth + nav
pnpm test:regression  # All 5 suites (used in CI)
```

CI runs `test:regression` — new test files in `e2e/` won't run in CI until explicitly added to the regression script in `package.json`.

### Deployment

The app is configured for Cloudflare Pages:

```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── server/         # Server-only code (db, auth, email, stripe)
│   ├── stores/         # Svelte stores (cart)
│   └── data/           # Static data (products)
├── routes/
│   ├── api/            # API endpoints (checkout, webhooks)
│   ├── vehicles/       # Vehicle management
│   ├── vendors/        # Vendor management
│   ├── repairs/        # Repair tracking
│   ├── notes/          # Notes
│   ├── merch/          # Merch store
│   ├── demo/           # Demo mode
│   ├── sign-in/        # Authentication
│   ├── sign-up/
│   └── users/          # User profiles
└── app.html            # HTML template
```

## The Frunk Story

This app has been a dream of mine for a few years now. It started as sort of fake app project just for me to work on my webdev skills. After a while I realized it was actually a decent idea and decided to try to build it for real.

For whatever reason, over the years I would build this app until it was about 75% done, then put it down for about 9 months and not touch it. Then I would decide to build it in a different framework and would get it to 75% done and the cycle would repeat. But recently when I realized how powerful Claude Code was, I decided to finish it for real.

## Roadmap

- [x] User authentication
- [x] Merch store with Stripe + Printful
- [x] Scheduled maintenance reminders
- [x] iOS/Android mobile apps (Capacitor)
- [x] Desktop apps (Tauri)
- [ ] Maintenance due badges on vehicle list
- [ ] Brand/UI redesign
- [ ] Premium tier features
- [ ] Tauri/Capacitor flow/UI tweaks
- [ ] Use cleanroom components?
- [ ] Platform migrations (SvelteKit -> Next, Cloudflare -> Vercel)

## License

MIT

## Author

[Mark McDermott](https://markmcdermott.io)
