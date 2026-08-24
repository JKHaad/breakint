# Breakint

A portfolio/agency website with a contact form backend.

## Structure

- **Root**: Static HTML/CSS/JS frontend
- **server/**: Node.js/Express backend for handling contact form submissions

## Features

- Responsive portfolio pages (index, about, work, capabilities, contact)
- Contact form with email delivery via SMTP
- SEO-friendly (sitemap.xml, robots.txt)
- PWA-ready (manifest, icons)

## Local Development

### Frontend
Open `index.html` directly in browser, or serve with any static server:
```bash
npx serve .
```

### Backend
```bash
cd server
cp .env.example .env   # Fill in your SMTP credentials
npm install
npm start
```
Runs on `http://localhost:3001` by default.

## Environment Variables (server/.env)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3001) |
| `RECEIVER_EMAIL` | Where form submissions are sent |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_SECURE` | Use TLS (default: false) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |

## Deployment

- **Frontend**: Deploy static files to Netlify, Vercel, GitHub Pages, etc.
- **Backend**: Deploy `server/` to Render, Railway, Fly.io, or any Node.js host.

See `server/README.md` for backend-specific deployment notes.