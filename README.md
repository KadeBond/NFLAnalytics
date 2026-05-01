# NFL Dashboard — Netlify

Free hosting via Netlify. No credit card required.

## File structure

```
NFLAnalytics/
├── netlify.toml              # Netlify config (routes /api/* to the function)
├── public/                   # Static frontend
│   ├── index.html            # Page shell and tabs
│   ├── styles.css            # All styling
│   ├── data.js               # Fallback static data (offseason)
│   ├── api.js                # Fetch calls + ESPN response parsers
│   └── app.js                # All rendering logic
└── netlify/
    └── functions/
        ├── api.js            # ESPN proxy (runs on Netlify's servers)
        └── package.json
```

## Setup

### 1. Push to GitHub

- Create a new repo on github.com (call it nfl-dashboard or similar)
- In VS Code terminal:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/YOURREPO.git
git push -u origin main
```

### 2. Deploy on Netlify

- Go to netlify.com → Sign up free (use your GitHub account)
- Click "Add new site" → "Import an existing project" → GitHub
- Select your repo
- Leave all build settings as-is (netlify.toml handles it)
- Click Deploy

Netlify gives you a free URL like `nfl-dashboard-abc123.netlify.app`.

### 3. Done

To update the site later, just push to GitHub — Netlify auto-deploys.

## Troubleshooting

- Visual bug → `public/styles.css`
- Wrong data → `public/data.js` (fallback) or `public/api.js` (ESPN parsing)
- Wrong content rendered → `public/app.js`
- API calls failing → `netlify/functions/api.js`
