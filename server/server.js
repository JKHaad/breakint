require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();

// Most hosts (Render, Railway, Heroku, etc.) sit behind a reverse proxy —
// this makes req.ip and rate-limiting work correctly there.
app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '20kb' }));

const PORT = process.env.PORT || 3001;
const RECEIVER_EMAIL = process.env.RECEIVER_EMAIL || 'info@breakint.com';

// --- CORS ---
// Only requests from these origins are allowed to call this API.
// Set ALLOWED_ORIGINS in your .env as a comma-separated list, e.g.:
//   ALLOWED_ORIGINS=https://breakint.com,https://www.breakint.com
// Defaults to breakint.com if not set. Common local dev origins (Live Server,
// VS Code preview, etc.) are always allowed on top of that so localhost
// testing works without touching .env.
const localDevOrigins = [
    'http://localhost:5500', 'http://127.0.0.1:5500',
    'http://localhost:5501', 'http://127.0.0.1:5501',
    'http://localhost:3000', 'http://127.0.0.1:3000',
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://breakint.com,https://www.breakint.com')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
    .concat(localDevOrigins);

app.use(cors({
    origin(origin, callback) {
        // Allow server-to-server / curl / health checks with no Origin header
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    }
}));

// --- Rate limiting ---
// Prevents the contact form from being spammed / used to blast email.
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,                   // 10 submissions per IP per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Too many messages sent. Please try again later.' }
});

// --- SMTP "sender" mailbox ---
// The account that actually authenticates and sends the email.
// Configure these in your .env file (see .env.example). SMTP_USER / SMTP_PASS
// are intentionally left blank there until you've picked a sending mailbox.
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587/25
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

app.post('/api/contact', contactLimiter, async (req, res) => {
    if (!smtpConfigured) {
        console.error('Contact form submitted, but SMTP_HOST/SMTP_USER/SMTP_PASS are not set in .env yet.');
        return res.status(503).json({ ok: false, error: 'Email sending is not configured yet.' });
    }

    const { name, phone, email, subject, message } = req.body || {};

    if (!name || !phone || !email || !subject || !message) {
        return res.status(400).json({ ok: false, error: 'All fields are required.' });
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
    }

    const html = `
        <h2>New website inquiry — breakint.com</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong><br>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
    `;

    try {
        await transporter.sendMail({
            from: process.env.SMTP_USER,       // must match the authenticated SMTP account
            to: RECEIVER_EMAIL,                 // info@breakint.com
            replyTo: email,                     // replying goes straight to the visitor
            subject: `[Website Inquiry] ${subject}`,
            html,
        });
        res.json({ ok: true });
    } catch (err) {
        console.error('Failed to send contact email:', err);
        res.status(500).json({ ok: false, error: 'Failed to send message. Please try again later.' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ ok: true, smtpConfigured });
});

app.listen(PORT, () => {
    console.log(`Contact form backend running on port ${PORT}`);
    if (!smtpConfigured) {
        console.warn('⚠️  SMTP is not configured yet — fill in SMTP_HOST/SMTP_USER/SMTP_PASS in .env to enable sending.');
    }
});
