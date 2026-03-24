# Dell Warranty Dispatch

A web app for IT teams to look up Dell device warranty status and submit **onsite warranty service dispatch jobs** directly to Dell — all from a clean, step-by-step interface.

Built with Next.js 15, TypeScript, and Tailwind CSS. Runs locally or in Docker.

---

## Features

- **Warranty lookup** — enter a Dell service tag to instantly check warranty status, expiry date, days remaining, and service level
- **Dispatch submission** — fill in the issue description, contact details, and site address, then submit an onsite service request to Dell via the TechDirect API
- **Org pre-fill** — configure your organisation's contact and address details once via environment variables; they pre-fill every dispatch form automatically
- **Warranty warnings** — highlighted alerts when a device is out of warranty or expiring within 90 days
- **Docker ready** — single `docker compose up` deployment

---

## Screenshots

### Step 1 — Service Tag Lookup
Enter the Dell service tag to check warranty before raising a job.

### Step 2 — Warranty Results
See warranty status, expiry, days remaining, service level, and all entitlements at a glance.

### Step 3 — Log the Issue
Describe the fault, set severity, confirm contact details and the onsite address.

### Step 4 — Confirmation
Case number returned from Dell once the dispatch is submitted.

---

## Prerequisites

- **Node.js 22+** (or Docker)
- A **Dell TechDirect account** with API access — register at [techdirect.dell.com](https://techdirect.dell.com)
  - You need: **Client ID** and **Client Secret** from your TechDirect developer portal
  - For dispatch submission you also need **dispatch API permissions** enabled on your account (email `APIs_TechDirect@Dell.com` to request)

---

## Quick Start

### Local development

```bash
# 1. Clone
git clone https://github.com/itbycory/DellWarrantyDispatch.git
cd DellWarrantyDispatch

# 2. Install dependencies
npm install

# 3. Configure credentials
cp .env.example .env.local
# Edit .env.local with your Dell API credentials and org details

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker

```bash
cp .env.example .env.local
# Edit .env.local

docker compose up
```

App available at [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

### Required

| Variable | Description |
|---|---|
| `DELL_CLIENT_ID` | Dell TechDirect API client ID |
| `DELL_CLIENT_SECRET` | Dell TechDirect API client secret |

### Optional — API Endpoints

These default to Dell's production URLs. Only change if Dell provides different endpoints.

| Variable | Default |
|---|---|
| `DELL_TOKEN_URL` | `https://apigtwb2c.us.dell.com/auth/oauth/v2/token` |
| `DELL_WARRANTY_URL` | `https://apigtwb2c.us.dell.com/PROD/sbil/eapi/v5/asset-entitlements` |
| `DELL_DISPATCH_URL` | `https://apigtwb2c.us.dell.com/PROD/support/cases/v2/dispatch` |

### Optional — Organisation Defaults

Pre-fill the dispatch form for your organisation so staff don't need to re-enter the same details every time.

| Variable | Example |
|---|---|
| `ORG_NAME` | `Department for Education` |
| `ORG_CONTACT_NAME` | `Jane Smith` |
| `ORG_CONTACT_EMAIL` | `jane@example.gov.uk` |
| `ORG_CONTACT_PHONE` | `+44 7700 000000` |
| `ORG_ADDRESS_LINE1` | `Sanctuary Buildings` |
| `ORG_ADDRESS_LINE2` | `20 Great Smith Street` |
| `ORG_CITY` | `London` |
| `ORG_POSTCODE` | `SW1P 3BT` |
| `ORG_COUNTRY` | `GB` |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/warranty?serviceTag=ABC1234` | Look up warranty for a service tag |
| `POST` | `/api/dispatch` | Submit an onsite dispatch job to Dell |
| `GET` | `/api/config` | Returns org config status (no secrets exposed) |

### POST `/api/dispatch` — Request Body

```json
{
  "serviceTag": "ABC1234",
  "issueDescription": "Screen backlight has failed. Device is unusable.",
  "severity": "NORMAL",
  "contactFirstName": "Jane",
  "contactLastName": "Smith",
  "contactEmail": "jane@example.gov.uk",
  "contactPhone": "+44 7700 000000",
  "addressLine1": "Sanctuary Buildings",
  "addressLine2": "20 Great Smith Street",
  "city": "London",
  "postcode": "SW1P 3BT",
  "country": "GB",
  "preferredContactTime": "Weekdays 9am-5pm"
}
```

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── warranty/route.ts     # Warranty lookup endpoint
│   │   ├── dispatch/route.ts     # Dispatch submission endpoint
│   │   └── config/route.ts       # Org config endpoint
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                  # Main UI — 4-step workflow
├── lib/
│   ├── dell-api.ts               # Dell API client (OAuth2, warranty, dispatch)
│   └── utils.ts
├── .env.example                  # Environment variable template
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Dell API Notes

Authentication uses **OAuth2 client credentials flow**. Tokens are cached in-process and automatically refreshed before expiry.

- The **warranty API** is available to all TechDirect API subscribers
- The **dispatch API** requires additional permissions — if you receive a `403`, contact Dell at `APIs_TechDirect@Dell.com` to request dispatch API access on your TechDirect account

---

## Related Projects

- [DellSnipeITSync](https://github.com/itbycory/DellSnipeITSync) — Sync Dell warranty data into Snipe-IT asset management

---

## Licence

MIT
