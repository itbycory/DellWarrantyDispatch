# Dell Warranty Dispatch

A web app for IT teams to look up Dell device warranty status, submit **onsite warranty service dispatch jobs** directly to Dell, and track the status of open cases — all from a clean, step-by-step interface.

Built with Next.js 15, TypeScript, and Tailwind CSS. Runs locally or in Docker. No config files required — everything is set up through the web UI on first run.

---

## Features

- **Web-based setup** — enter your Dell API credentials and org details through the UI on first run; no config files to edit
- **Settings page** — update credentials, org details, and API endpoints at any time from the browser
- **Warranty lookup** — enter a Dell service tag to instantly check warranty status, expiry date, days remaining, and service level
- **Dispatch submission** — fill in the issue description, contact details, and site address, then submit an onsite service request to Dell via the TechDirect API
- **Case tracking** — every submitted dispatch is saved locally; open the Cases view to see all jobs and refresh their live status from Dell
- **Org pre-fill** — org contact and address details pre-fill every dispatch form automatically once configured
- **Warranty warnings** — highlighted alerts when a device is out of warranty or expiring within 90 days
- **Docker ready** — single `docker compose up -d --build` deployment, no `.env` file needed

---

## Screenshots

### First Run — Setup Prompt
On first open, a banner guides you to Settings to enter your Dell API credentials.

### Settings Page
Enter your Dell TechDirect Client ID and Secret, test the connection, and set your organisation's default contact and address details.

### Step 1 — Service Tag Lookup
Enter the Dell service tag to check warranty before raising a job.

### Step 2 — Warranty Results
See warranty status, expiry, days remaining, service level, and all entitlements at a glance.

### Step 3 — Log the Issue
Describe the fault, set severity, confirm contact details and the onsite address.

### Step 4 — Confirmation
Case number returned from Dell once the dispatch is submitted.

### Cases View
All submitted dispatch jobs listed with live status. Click any case to expand full details and refresh the status directly from the Dell API.

---

## Prerequisites

- **Docker** (recommended) or Node.js 22+
- A **Dell TechDirect account** with API access — register at [techdirect.dell.com](https://techdirect.dell.com)
  - You need: **Client ID** and **Client Secret** from your TechDirect developer portal
  - For dispatch submission you also need **dispatch API permissions** enabled on your account (email `APIs_TechDirect@Dell.com` to request)

---

## Quick Start

### Docker (recommended)

```bash
git clone https://github.com/itbycory/DellWarrantyDispatch.git
cd DellWarrantyDispatch

docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000) — you'll be prompted to enter your credentials via the Settings page.

### Local development

```bash
git clone https://github.com/itbycory/DellWarrantyDispatch.git
cd DellWarrantyDispatch

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the setup prompt.

---

## Configuration

### Option 1 — Web UI (recommended)

Click the **Settings** icon (⚙) in the top-right corner of the app, or follow the setup banner on first run. Enter your credentials there — they are saved to `data/config.json` and persist across container restarts.

### Option 2 — Environment variables

For automated/scripted deployments you can still supply credentials via a `.env.local` file. Copy the example and fill it in:

```bash
cp .env.example .env.local
```

Environment variables act as a fallback — if credentials have been saved via the UI, those take precedence.

### Configuration precedence

```
GUI-saved settings (data/config.json)  ← highest priority
   ↓ fallback
Environment variables (.env.local)
   ↓ fallback
Built-in defaults
```

---

## Environment Variables (optional)

| Variable | Description |
|---|---|
| `DELL_CLIENT_ID` | Dell TechDirect API client ID |
| `DELL_CLIENT_SECRET` | Dell TechDirect API client secret |
| `DELL_TOKEN_URL` | OAuth token endpoint (default: Dell production URL) |
| `DELL_WARRANTY_URL` | Warranty API endpoint (default: Dell production URL) |
| `DELL_DISPATCH_URL` | Dispatch API endpoint (default: Dell production URL) |
| `ORG_NAME` | Organisation name |
| `ORG_CONTACT_NAME` | Default contact name |
| `ORG_CONTACT_EMAIL` | Default contact email |
| `ORG_CONTACT_PHONE` | Default contact phone |
| `ORG_ADDRESS_LINE1` | Site address line 1 |
| `ORG_ADDRESS_LINE2` | Site address line 2 (optional) |
| `ORG_CITY` | City |
| `ORG_POSTCODE` | Postcode |
| `ORG_COUNTRY` | Country code (e.g. `AU`, `GB`) |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/warranty?serviceTag=ABC1234` | Look up warranty for a service tag |
| `POST` | `/api/dispatch` | Submit an onsite dispatch job to Dell |
| `GET` | `/api/cases` | List all locally saved dispatch cases |
| `GET` | `/api/cases/:caseNumber` | Get a single saved case |
| `POST` | `/api/cases/:caseNumber` | Refresh case status from the Dell API |
| `GET` | `/api/config` | Returns current config status (credentials never exposed) |
| `POST` | `/api/config` | Save settings (used by the Settings page) |
| `POST` | `/api/test-connection` | Test Dell OAuth credentials |

### POST `/api/dispatch` — Request Body

```json
{
  "serviceTag": "ABC1234",
  "issueDescription": "Screen backlight has failed. Device is unusable.",
  "severity": "NORMAL",
  "contactFirstName": "Jane",
  "contactLastName": "Smith",
  "contactEmail": "it@yourorg.com",
  "contactPhone": "0800000000",
  "addressLine1": "1 Example Street",
  "addressLine2": "",
  "city": "Adelaide",
  "postcode": "5000",
  "country": "AU",
  "preferredContactTime": "Weekdays 9am-5pm"
}
```

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── warranty/route.ts        # Warranty lookup endpoint
│   │   ├── dispatch/route.ts        # Dispatch submission + case save
│   │   ├── cases/route.ts           # List saved cases
│   │   ├── cases/[id]/route.ts      # Case detail + status refresh
│   │   ├── config/route.ts          # Config read/write endpoint
│   │   └── test-connection/route.ts # Dell OAuth credential test
│   ├── cases/
│   │   └── page.tsx                 # Dispatch cases tracker
│   ├── settings/
│   │   └── page.tsx                 # Settings page
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                     # Main UI — 4-step workflow
├── lib/
│   ├── cases.ts                     # Case persistence (data/cases.json)
│   ├── config.ts                    # Config read/write (data/config.json + env fallback)
│   ├── dell-api.ts                  # Dell API client (OAuth2, warranty, dispatch, case status)
│   └── utils.ts
├── data/                            # Persisted config and cases (Docker volume mount)
│   └── .gitkeep
├── .env.example                     # Optional environment variable template
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Dell API Notes

Authentication uses **OAuth2 client credentials flow**. Tokens are cached in-process and automatically refreshed before expiry. The token cache is cleared whenever credentials are updated via Settings.

- The **warranty API** is available to all TechDirect API subscribers
- The **dispatch API** requires additional permissions — if you receive a `403`, contact Dell at `APIs_TechDirect@Dell.com` to request dispatch API access on your TechDirect account
- The **case status API** uses `GET {dispatch-url}/{caseNumber}` — the same base URL as dispatch submission. This follows Dell's standard REST pattern; confirm the exact endpoint in your TechDirect API documentation if needed.

---

## Related Projects

- [DellSnipeITSync](https://github.com/itbycory/DellSnipeITSync) — Sync Dell warranty data into Snipe-IT asset management

---

## Licence

MIT
