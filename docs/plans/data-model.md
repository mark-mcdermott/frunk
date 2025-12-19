# Frunk Data Model

## Overview

This document defines the complete data model for Frunk's car document storage features. It serves as the authoritative reference for all entity relationships and field definitions.

## Entity Relationship Diagram

```
User (existing)
 ├── Car (many)
 │    ├── Repair (many)
 │    │    └── Note (many)
 │    ├── MaintenanceItem (many)
 │    │    └── Repair (many) ← completed instances
 │    ├── Note (many)
 │    └── Gallery (many) ← Note with type='gallery'
 │
 ├── Note (many) ← user-level notes
 └── Vendor (many) ← user-owned vendors
      └── Note (many)

Note
 └── Note (many) ← infinite nesting, inherits root ancestor's owner
```

## Entities

### Car

A vehicle owned by a user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | serial | yes | Primary key |
| uuid | text | yes | Public identifier |
| user_id | text | yes | FK → User.uuid |
| make | text | yes | Manufacturer (e.g., "Toyota") |
| model | text | yes | Model name (e.g., "Camry") |
| year | integer | yes | Model year |
| plate | text | no | License plate number |
| vin | text | no | Vehicle Identification Number |
| color | text | no | Exterior color |
| trim | text | no | Trim level (e.g., "SE", "Limited") |
| miles | integer | no | Current odometer reading |
| miles_when_purchased | integer | no | Odometer at purchase |
| price_when_purchased | integer | no | Purchase price in cents |
| purchase_date | date | no | Date of purchase |
| vendor_id | text | no | FK → Vendor.uuid (where purchased) |
| insurance_info | text | no | Insurance policy details |
| registration_expiry | date | no | Registration expiration date |
| created_at | timestamp | yes | Record creation time |
| updated_at | timestamp | yes | Last modification time |

### Vendor

A business entity (dealership, repair shop, parts store, etc.). Vendors are user-scoped and reusable across cars and repairs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | serial | yes | Primary key |
| uuid | text | yes | Public identifier |
| user_id | text | yes | FK → User.uuid (owner) |
| name | text | yes | Business name |
| address | text | no | Street address |
| city | text | no | City |
| state | text | no | State/province |
| zip | text | no | Postal code |
| phone | text | no | Phone number |
| website | text | no | Website URL |
| created_at | timestamp | yes | Record creation time |
| updated_at | timestamp | yes | Last modification time |

### MaintenanceItem

A scheduled/recurring maintenance task for a car (e.g., "Oil Change every 5,000 miles or 6 months").

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | serial | yes | Primary key |
| uuid | text | yes | Public identifier |
| car_id | text | yes | FK → Car.uuid |
| name | text | yes | Maintenance name (e.g., "Oil Change") |
| description | text | no | Additional details |
| interval_miles | integer | no | Miles between service (e.g., 5000) |
| interval_months | integer | no | Months between service (e.g., 6) |
| notify_before_days | integer | no | Days before due to send reminder |
| notify_before_miles | integer | no | Miles before due to send reminder |
| created_at | timestamp | yes | Record creation time |
| updated_at | timestamp | yes | Last modification time |

**Notes:**
- At least one of `interval_miles` or `interval_months` should be set
- Next due date/miles calculated from most recent linked Repair
- If no linked Repairs exist, due immediately (or from car purchase date)

### Repair

A repair or maintenance event for a car. Can be standalone or linked to a MaintenanceItem.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | serial | yes | Primary key |
| uuid | text | yes | Public identifier |
| car_id | text | yes | FK → Car.uuid |
| maintenance_item_id | text | no | FK → MaintenanceItem.uuid (if scheduled maintenance) |
| type | text | yes | Repair type (e.g., "Oil Change", "Brake Pads") |
| date | date | yes | Date of repair |
| vendor_id | text | no | FK → Vendor.uuid |
| cost | integer | no | Cost in cents |
| miles | integer | no | Odometer reading at time of repair |
| description | text | no | Additional details |
| created_at | timestamp | yes | Record creation time |
| updated_at | timestamp | yes | Last modification time |

**Maintenance Completion Flow:**
1. User views upcoming/due maintenance items
2. User clicks "Mark Complete" on a MaintenanceItem
3. System creates Repair with `maintenance_item_id` set
4. User fills in vendor, cost, date, miles
5. Next due calculated from this Repair's date/miles + intervals

### Note

A flexible content block that can belong to User, Car, Repair, Vendor, or another Note. Also serves as a Gallery when `type='gallery'`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | serial | yes | Primary key |
| uuid | text | yes | Public identifier |
| title | text | yes | Note title |
| body | text | no | Note content (textarea) |
| image_url | text | no* | Cloudflare R2 URL (*required for gallery children) |
| type | text | yes | 'note' or 'gallery' (default: 'note') |
| order | integer | no | Sort order (for gallery children) |
| parent_note_id | text | no | FK → Note.uuid (for nesting) |
| user_id | text | no | FK → User.uuid (if user-level note) |
| car_id | text | no | FK → Car.uuid (if car-level note) |
| repair_id | text | no | FK → Repair.uuid (if repair-level note) |
| vendor_id | text | no | FK → Vendor.uuid (if vendor-level note) |
| created_at | timestamp | yes | Record creation time |
| updated_at | timestamp | yes | Last modification time |

**Ownership Rules:**
- A root note (no parent_note_id) must have exactly ONE of: user_id, car_id, repair_id, vendor_id
- A child note (has parent_note_id) inherits ownership from its root ancestor
- Child notes should have null for user_id, car_id, repair_id, vendor_id

**Gallery Rules:**
- A gallery is a Note with `type='gallery'`
- Gallery children are Notes with `parent_note_id` pointing to the gallery
- Gallery children MUST have `image_url` set
- Gallery children use `order` field for sorting

## Relationships Summary

| Relationship | Type | Description |
|--------------|------|-------------|
| User → Car | 1:N | A user owns many cars |
| User → Vendor | 1:N | A user creates many vendors |
| User → Note | 1:N | A user can have personal notes |
| Car → MaintenanceItem | 1:N | A car has a maintenance schedule |
| Car → Repair | 1:N | A car has many repairs |
| Car → Note | 1:N | A car can have many notes/galleries |
| MaintenanceItem → Repair | 1:N | A maintenance item has completion history |
| Repair → Note | 1:N | A repair can have many notes |
| Repair → Vendor | N:1 | A repair was done at a vendor |
| Car → Vendor | N:1 | A car was purchased from a vendor |
| Vendor → Note | 1:N | A vendor can have many notes |
| Note → Note | 1:N | Notes can be infinitely nested |

## Image Storage

All images are stored in Cloudflare R2:
- Bucket: `frunk-images` (or similar)
- Path pattern: `{entity}/{uuid}/{filename}`
- Examples:
  - `cars/abc123/photo.jpg`
  - `notes/def456/attachment.png`
- The `image_url` field stores the full R2 URL

## Notifications (Future)

Maintenance reminders will be sent when:
- `next_due_date - notify_before_days <= today`
- `next_due_miles - notify_before_miles <= current_miles`

Implementation options:
- Cloudflare Workers Cron for daily check
- Email via AWS SES (already integrated)
- Push notifications (future mobile app)

## Implementation Order

Recommended build sequence:

### Phase 1: Core Entities
- [ ] Car CRUD (create, read, update, delete)
- [ ] Car list with search/filter
- [ ] Vendor CRUD
- [ ] Vendor selection dropdown (for car purchase)

### Phase 2: Repairs
- [ ] Repair CRUD with vendor selection
- [ ] Repair list/history per car
- [ ] Odometer tracking

### Phase 3: Maintenance Schedule
- [ ] MaintenanceItem CRUD
- [ ] "Mark Complete" → creates linked Repair
- [ ] Due date/miles calculation
- [ ] Upcoming maintenance dashboard

### Phase 4: Notes System
- [ ] Note model with polymorphic ownership
- [ ] Basic notes on Car, Repair, Vendor, User
- [ ] Note nesting (child notes)

### Phase 5: Galleries & Images
- [ ] Cloudflare R2 integration
- [ ] Image upload component
- [ ] Gallery type notes
- [ ] Ordered gallery items with drag-and-drop

### Phase 6: Notifications
- [ ] Cloudflare Workers Cron job
- [ ] Email reminders via SES
- [ ] In-app notification center

### Phase 7: Polish
- [ ] Search across all entities
- [ ] Bulk operations
- [ ] Export functionality (PDF, CSV)

## Schema Conventions

Following existing Frunk patterns:
- Primary key: `id` (serial)
- Public identifier: `uuid` (text, unique)
- Foreign keys reference `uuid`, not `id`
- Timestamps: `created_at`, `updated_at` with timezone
- Money: stored in cents as integer
- Booleans: stored as integer (0/1)

## Decided Against (For Now)

### Parts Tracking
- Decision: Not implementing dedicated Part entity
- Reasoning: Use notes on Repairs to document parts used
- Future: Can add Part/PartPurchase entities if demand emerges

### Sharing/Collaboration
- Decision: Single-user focus (family can share login)
- Future: Could add user permissions per car if needed
