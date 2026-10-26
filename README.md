# Connect Care

A web application built with TanStack Start, Vite, React and TypeScript.

## Requirements
- Node.js 20 or newer recommended
- npm

## Run locally
```bash
git clone https://github.com/Gurnoor1-dev/connect-care.git
cd connect-care
npm install
npm run dev
```

Open the local URL shown in the terminal. Configure any required services using a local `.env` file based on the environment variable names referenced in the source code. Never commit secrets.

## Build and preview
```bash
npm run build
npm run preview
```

## Deploy from a terminal
Install the Vercel CLI and deploy from the project root:

```bash
npm install -g vercel
vercel
vercel --prod
```

## Deploy on Vercel
1. Import this repository into Vercel.
2. Confirm the detected framework/build settings are appropriate for TanStack Start.
3. Use `npm install` and `npm run build` unless the project configuration specifies otherwise.
4. Add all required environment variables in Vercel Project Settings.
5. Deploy a preview first, verify the app and service integrations, then promote to production.

## Security
Keep API keys and private service credentials in environment variables. Do not expose server-only secrets through client-side variables.