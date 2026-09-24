# IoT-Based Landslide Early Detection System Website

A professional static research website built with **HTML, CSS and vanilla JavaScript**, with **Vercel Serverless Functions** for the secure document manager.

## What is included

- Responsive multi-page research website
- Dark blue + amber design system
- Scroll reveal animations and counters
- Research problem, gap, objectives, technology and model results from the supplied presentation
- Evidence gallery and existing live monitoring-dashboard link
- Dynamic public document library
- Secure admin area with Gmail OTP verification
- Upload and delete support through Vercel Blob
- Video upload support (latest uploaded MP4/WebM is shown on Results & Media)
- Vercel-ready configuration and security headers

## Pages

- `index.html` — Home
- `research.html` — Research problem, gap, objectives, comparison, methodology
- `technology.html` — Sensors, communications, processing stack, field hardware
- `milestones.html` — Gantt schedule and current implementation status
- `results.html` — AI results, progress, evidence, video, live dashboard
- `documents.html` — Public project file library
- `about.html` — Researcher and project profile
- `admin.html` — OTP-protected upload/delete manager

## Deploy on Vercel

1. Push this folder to a GitHub repository or import the folder into Vercel.
2. Create/connect a **Public Vercel Blob** store to the project. New Vercel Blob projects can use OIDC automatically.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `ADMIN_EMAIL=kamkanamlage394@gmail.com`
   - `GMAIL_USER=<gmail account used to send OTP>`
   - `GMAIL_APP_PASSWORD=<Gmail App Password>`
   - `OTP_SECRET=<long random secret, at least 32 characters>`
4. Redeploy after adding environment variables.
5. Open `/admin` on the deployed site and test: Send OTP → verify → upload a PDF → open it → delete it.
6. Upload an MP4/WebM under the **Video** category; it will appear automatically on `/results`.

## Gmail setup for OTP

The sender Gmail account must have Google 2-Step Verification enabled and a Gmail **App Password** created. Do not put the Gmail password or App Password in source code. Store it only in Vercel Environment Variables.

The recipient is currently configured as `kamkanamlage394@gmail.com`. It can be changed with the `ADMIN_EMAIL` environment variable.

## Notes about Vercel Blob

Files are uploaded directly from the browser to a Vercel Blob store using a short-lived presigned upload URL generated only after admin verification. This avoids routing large files through a Vercel Function.

Uploaded project files are public by design because the website provides public document downloads. If the client later wants private documents, the storage/read flow should be switched to a private Blob store and signed download URLs.

## Local development

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example`, then run:

```bash
npm run dev
```

The Vercel CLI is used locally because the project includes `/api` serverless routes.

## Content source

The current research content is based on the supplied 21-page presentation. Unsupported details (supervisors, group ID, official project contact, full bibliography and final demo video) are intentionally not invented. See `CONTENT_NOTES.md` for a detailed content audit.
