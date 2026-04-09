# AI Parenting Coach — WhatsApp Bot

A fully automated AI Parenting Coach that runs on WhatsApp. Delivers personalized daily guidance to parents based on their child's age, development stage, and family context.

**Cost: ~$8–13/month. No app. No subscription. Just WhatsApp.**

---

## Features

- 7-step conversational onboarding (no forms)
- Personalized morning plan every day at 8:00
- Evening check-in at 21:00
- Weekly family review every Sunday at 19:00
- Free-form AI coaching between scheduled messages
- Commands: `stop`, `reprendre`, `aide`, `reset`
- Admin API to view/update profiles and manually trigger crons
- Supports Meta Cloud API (production) and Twilio Sandbox (dev/test)

---

## Setup in 20 Steps

### Prerequisites
- Node.js 18+
- A server with a public HTTPS URL (Railway, Render, or VPS)
- An Anthropic API key (claude.ai/api)

---

### Step 1 — Clone and install

```bash
git clone <your-repo>
cd parenting-coach-whatsapp
npm install
```

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your values (see section below).

---

### Option A — Twilio Sandbox (dev/test, 5 minutes)

**Step 3** — Create a free Twilio account at twilio.com

**Step 4** — Go to Messaging → Try it out → Send a WhatsApp message

**Step 5** — Follow the sandbox join instructions (send a WhatsApp message to the sandbox number)

**Step 6** — Copy your `ACCOUNT_SID` and `AUTH_TOKEN` from the dashboard

**Step 7** — In `.env`, set:
```
PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886
```

**Step 8** — Start the server and set webhook in Twilio console to:
`https://your-server.com/webhook`

---

### Option B — Meta Cloud API (production)

**Step 3** — Go to developers.facebook.com → Create App → Business type

**Step 4** — Add WhatsApp product to the app

**Step 5** — Go to WhatsApp → Getting Started → copy Phone Number ID

**Step 6** — Generate a Permanent Token via System User in Meta Business Suite
(Settings → Business Settings → System Users → Add token with `whatsapp_business_messaging` permission)

**Step 7** — In `.env`, set:
```
PROVIDER=meta
META_ACCESS_TOKEN=your_permanent_token
PHONE_NUMBER_ID=your_phone_number_id
VERIFY_TOKEN=any_random_string_you_choose
```

**Step 8** — Deploy your server to get a public HTTPS URL

**Step 9** — In Meta App Dashboard → WhatsApp → Configuration → Webhook:
- URL: `https://your-server.com/webhook`
- Verify Token: same value as `VERIFY_TOKEN` in your `.env`
- Subscribe to: `messages`

**Step 10** — Register message templates in Meta Business Manager for cron sends:
- `daily_morning_plan` — Body: `Bonjour {{1}} ! Voici ton plan parental du jour 🌅 {{2}}` — Category: UTILITY
- `evening_checkin` — Body: `Bilan du soir 🌙 Comment s'est passée ta journée avec {{1}} ?` — Category: UTILITY
- `weekly_review` — Body: `C'est dimanche ! Faisons le bilan de la semaine 📋` — Category: UTILITY

---

### Step 11 — Set your AI key

```
AI_API_KEY=your_anthropic_api_key
AI_MODEL=claude-sonnet-4-5
```

Get a key at console.anthropic.com

---

### Step 12 — Set admin token

```
ADMIN_TOKEN=some_long_random_string
```

---

### Step 13 — Create logs directory

```bash
mkdir logs
```

---

### Step 14 — Start the server

```bash
npm start
# or for development with auto-restart:
npm run dev
```

---

### Step 15 — Test the webhook

```bash
curl https://your-server.com/health
# → {"status":"ok","ts":"..."}
```

---

### Step 16 — Send your first WhatsApp message

Send any message to your WhatsApp number. The bot will start the 7-step onboarding flow.

---

### Step 17 — Complete onboarding

Answer the 7 questions. The bot will create your profile and activate daily messages.

---

### Step 18 — Test crons manually (admin)

```bash
curl -X POST https://your-server.com/admin/trigger/morning \
  -H "x-admin-token: your_admin_token"
```

---

### Step 19 — View user profiles (admin)

```bash
curl https://your-server.com/admin/users \
  -H "x-admin-token: your_admin_token"
```

---

### Step 20 — Deploy to production

**Railway:**
```bash
npm install -g railway
railway init
railway up
railway domain  # get your public URL
```

**Render:** Connect your GitHub repo, set environment variables in dashboard, deploy.

**Hetzner VPS (~$5/month):**
```bash
npm install -g pm2
pm2 start bot.js --name parenting-coach
pm2 save
pm2 startup
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PROVIDER` | Yes | `meta` or `twilio` |
| `META_ACCESS_TOKEN` | Meta only | Permanent system user token |
| `PHONE_NUMBER_ID` | Meta only | WhatsApp phone number ID |
| `VERIFY_TOKEN` | Meta only | Webhook verification string |
| `TWILIO_ACCOUNT_SID` | Twilio only | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio only | Twilio auth token |
| `TWILIO_WHATSAPP_NUMBER` | Twilio only | Twilio sandbox number |
| `AI_API_KEY` | Yes | Anthropic API key |
| `AI_MODEL` | No | Default: `claude-sonnet-4-5` |
| `PORT` | No | Default: `3000` |
| `TIMEZONE` | No | Default: `Africa/Casablanca` |
| `ADMIN_TOKEN` | No | Protects `/admin` endpoints |
| `LOG_LEVEL` | No | Default: `info` |

---

## File Structure

```
parenting-coach-whatsapp/
├── agents/
│   ├── SOUL.md              ← Coach brain + methodology
│   └── IDENTITY.md          ← Bot identity
├── users/                   ← One JSON profile per user (auto-created)
├── logs/                    ← Winston log files (auto-created)
├── handlers/
│   ├── messageHandler.js    ← Incoming message router
│   ├── profileLoader.js     ← Load/save user profiles
│   ├── onboardingFlow.js    ← 7-step profile builder
│   └── adminHandler.js      ← Admin REST API
├── cron/
│   ├── index.js             ← Init all cron jobs
│   ├── morningPlan.js       ← 08:00 daily
│   ├── eveningCheckin.js    ← 21:00 daily
│   └── weeklyReview.js      ← Sunday 19:00
├── services/
│   ├── whatsappService.js   ← Send abstraction (Meta + Twilio)
│   ├── aiService.js         ← Claude API wrapper
│   ├── sessionManager.js    ← Per-user conversation state
│   └── logger.js            ← Winston logger
├── bot.js                   ← Express server + webhook handlers
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

---

## Admin API

All admin routes require header `x-admin-token: <ADMIN_TOKEN>`.

| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | List all user profiles |
| GET | `/admin/users/:phone` | Get a single profile |
| PUT | `/admin/users/:phone` | Update a profile |
| POST | `/admin/trigger/morning` | Manually run morning plans |
| POST | `/admin/trigger/evening` | Manually run evening check-ins |
| POST | `/admin/trigger/weekly` | Manually run weekly review |

---

## User Commands

Users can send these messages at any time:

| Command | Action |
|---|---|
| `stop` | Pause automated messages |
| `reprendre` | Resume automated messages |
| `aide` | Show help menu |
| `reset` | Delete profile and restart onboarding |

---

## Cost Estimate

| Item | Cost |
|---|---|
| VPS Hetzner CX11 | ~$5/month |
| Claude API (light usage) | ~$3–8/month |
| Meta Cloud API | Free (1000 msgs/day) |
| Twilio Sandbox | Free (dev/test) |
| **Total** | **~$8–13/month** |

---

## Important WhatsApp Constraints

- **24h window rule**: Meta only allows free-form messages within 24h of user's last message. For cron messages sent outside this window, use approved templates.
- **Rate limit**: Meta free tier = 1000 messages/day. Cron adds 500ms delay between users.
- **Message length**: Max 4096 chars. Bot auto-splits long messages.
- **Deduplication**: Meta sends duplicate webhooks. Bot tracks message IDs and ignores duplicates.
- **Phone format**: Always use international format: `+212XXXXXXXXX`
