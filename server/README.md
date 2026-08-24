# Breakint Contact Form Backend

A small, hardened Express server that receives contact form submissions from
the website and relays them via SMTP to `info@breakint.com`.

Already built in:
- **Security headers** (helmet)
- **Rate limiting** (10 submissions per IP per 15 minutes, so the form can't be spammed)
- **CORS locked to your domain(s)** (configurable)
- **Input validation** (required fields + email format)
- **Deployment configs** for Render and Heroku-style hosts

All that's left for you: SMTP credentials and (if hosting elsewhere) a couple of URLs.

## How it works

1. Visitor fills out the form on the Contact page (Name, Phone, Email, Subject, Message).
2. The frontend sends that data as JSON to `POST /api/contact`.
3. This server authenticates with an SMTP "sender" mailbox and sends a
   formatted email to `info@breakint.com`, with the visitor's own email set
   as `Reply-To` (so replying goes straight back to them).

---

## Deploy in 3 steps

### 1. Pick a Node host and deploy this `server/` folder

Any of these work — pick whichever you're comfortable with:

**Render.com (easiest, has a free tier)**
1. Push this project to a GitHub repo.
2. In Render: New → Blueprint → point at your repo. It will read `render.yaml`
   automatically and set up the service (root directory `server`).
3. In the Render dashboard, fill in the environment variables marked
   "sync: false" in `render.yaml` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) —
   these are intentionally left out of the config file since they're secrets.
4. Deploy. Render will give you a URL like `https://breakint-contact-backend.onrender.com`.

**Railway / Heroku / any Node host**
1. Push this project to a GitHub repo (or deploy the `server` folder directly).
2. Set the root/start directory to `server`.
3. Set the environment variables listed in `.env.example` in that host's dashboard.
4. Deploy — the `Procfile` (`web: npm start`) and `package.json` `start` script
   are already set up for this.

**Your own VPS**
```bash
cd server
npm install
cp .env.example .env   # then fill in .env, see step 2 below
npm start               # or use pm2 / systemd to keep it running
```

### 2. Fill in your `.env` (or the host's environment variable dashboard)

```
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sending-address@example.com
SMTP_PASS=your-password-or-app-password
```

Common providers:
- **Gmail**: host `smtp.gmail.com`, port `587`, requires an [App Password](https://support.google.com/accounts/answer/185833) (not your regular password) if 2FA is on.
- **Outlook/Office365**: host `smtp.office365.com`, port `587`.
- **Zoho**: host `smtp.zoho.com`, port `587`.
- Your web host or a transactional email service (SendGrid, Mailgun, Amazon SES, Resend, etc.) will also give you SMTP host/port/credentials — these tend to be more reliable for site-generated email than a personal inbox.

`RECEIVER_EMAIL` and `ALLOWED_ORIGINS` already default to `info@breakint.com`
and `https://breakint.com` / `https://www.breakint.com` — only change these if
that's not accurate.

### 3. Point the website at your deployed backend

Once deployed, you'll have a backend URL (e.g. `https://breakint-contact-backend.onrender.com`).

Open `script.js` in the main site folder, find this line near the top of the
contact form section:

```js
const CONTACT_API_URL = '/api/contact';
```

Change it to your full backend URL:

```js
const CONTACT_API_URL = 'https://breakint-contact-backend.onrender.com/api/contact';
```

That's it — the form will now send real emails. Until this step is done (or
if the backend is ever down), the form automatically falls back to opening a
pre-filled email in the visitor's own email app, so it's never fully broken.

---

## Testing it

```bash
curl https://your-backend-url/api/health
```

Returns `{"ok":true,"smtpConfigured":true}` once SMTP is filled in correctly
(it'll say `false` if any of `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` are still empty).

## Notes

- This is a real Node server — it cannot run on the same static hosting as the
  plain HTML/CSS/JS site unless that host also runs Node processes. That's why
  it's a separate deploy from the rest of the site.
- `SMTP_USER` is also used as the `From` address, since most SMTP providers
  reject a `From` address that doesn't match the authenticated account.
