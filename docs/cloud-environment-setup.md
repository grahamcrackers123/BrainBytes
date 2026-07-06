# BrainBytes Cloud Environment Setup — Railway.app

## Overview

BrainBytes is deployed on **Railway.app** using its free tier. Railway is a cloud platform that simplifies deployment by automatically building and deploying from a GitHub repository, handling networking, SSL, and scaling automatically.

---

## 1. Railway.app Project Setup

### Step 1: Create a Railway Account

1. Go to https://railway.app/
2. Click **Login** → **Continue with GitHub**
3. Authorize Railway to access your GitHub account

### Step 2: Create Project from GitHub

1. Click **New Project** → **Deploy from GitHub repo**
2. Select `grahamcrackers123/BrainBytes`
3. Configure the services:

| Service | Root Directory | Build Command | Start Command |
|---------|---------------|---------------|---------------|
| Backend | `brainbytes-multi-container/backend` | `npm install` | `npm start` |
| Frontend | `brainbytes-multi-container/frontend` | `npm install && npm run build` | `npm run start` |
| MongoDB | Use Railway's **Add Plugin** → **MongoDB** | — | — |

### Step 3: Configure Health Checks

For each service in Railway dashboard → **Settings** → **Health Checks**:

| Service | Path | Period | Threshold |
|---------|------|--------|-----------|
| Backend | `/` | 30s | 3 failures |
| Frontend | `/` | 30s | 3 failures |

### Step 4: Configure Automatic Restarts

In **Settings** → **Restart Policy**:
- Set to **Always** for all services
- Railway automatically restarts crashed containers

---

## 2. Environment Variables

Add these in Railway dashboard → **Variables** for each service:

### Backend Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `GROQ_API_KEY` | *(your key)* | AI service authentication |
| `MONGO_URL` | *(copy from RAILWAY_MONGODB_URL)* + `/brainbytes` | MongoDB connection (see note below) |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3000` | Express server port |

> **Important**: Do NOT use `$(RAILWAY_MONGODB_URL)/brainbytes` for `MONGO_URL`. The template variable `$(VAR)` interpolation does not work reliably. Instead:
> 1. Look at the **auto-generated** `RAILWAY_MONGODB_URL` variable (Railway creates this when you add the MongoDB plugin)
> 2. Copy its **actual value** (e.g., `mongodb://user:password@host:27017`)
> 3. Set `MONGO_URL` to that value + `/brainbytes` (e.g., `mongodb://user:password@host:27017/brainbytes`)

### Frontend Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `$(BACKEND_URL)` | Backend API URL (Railway provides this) |
| `PORT` | `3000` | Next.js server port |

> **Note**: Railway auto-generates `RAILWAY_MONGODB_URL` and `BACKEND_URL` environment variables when you link services. No need to manually enter them.

---

## 3. Security Configuration

### 3.1 Sensitive Environment Variables

- All secrets stored in Railway's encrypted environment variable system
- Never committed to GitHub (`.env` files in `.gitignore`)
- `GROQ_API_KEY` is the only external secret

### 3.2 CORS Configuration

The backend already has CORS configured in `server.js`:

```js
app.use(cors());
```

For production, you can restrict CORS to specific origins in Railway:

```js
const cors = require('cors');
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

Add `CORS_ORIGIN=https://your-app.railway.app` to backend environment variables.

### 3.3 Network Security

Railway provides:
- **Auto-generated SSL/HTTPS** for all deployments
- **Private networking** between services (via internal DNS)
- **No public port exposure** for MongoDB (only accessible from other Railway services)

---

## 4. Monitoring and Logging

### 4.1 Railway Built-in Logging

Railway provides real-time logs for each service:

```
railway logs           # View all logs
railway logs --service backend    # Backend logs only
railway logs --tail    # Follow logs in real-time
```

### 4.2 Application-Level Logging

The backend already logs errors to console:

```js
console.error('Error fetching messages:', err);
```

Railway automatically captures stdout/stderr from each container.

### 4.3 Error Tracking

To add basic error tracking:

```js
// server.js — catch unhandled errors
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
```

### 4.4 Performance Monitoring

Railway provides:
- **CPU & Memory usage graphs** per service
- **Deployment history** with rollback capability
- **Response time metrics** (with custom domains)

---

## 5. Deployment Configuration

### 5.1 Railway Project Structure

```
BrainBytes/
├── brainbytes-multi-container/
│   ├── backend/
│   │   ├── Dockerfile          # Already exists
│   │   ├── package.json
│   │   └── ...
│   ├── frontend/
│   │   ├── Dockerfile          # Already exists
│   │   ├── package.json
│   │   └── ...
│   └── docker-compose.yml      # For local dev
├── .github/
│   └── workflows/
│       └── deploy-railway.yml  # Railway deployment workflow
```

### 5.2 Railway GitHub Integration

Railway automatically deploys when you push to `main`:
1. Connect your GitHub repo to Railway
2. Select the `main` branch for auto-deploy
3. Railway builds using the Dockerfile or Nixpacks

### 5.3 nixpacks.toml (for better build control)

Create `brainbytes-multi-container/backend/nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ['nodejs_22', 'curl']

[phases.install]
cmds = ['npm install']

[phases.build]
cmds = ['echo "No build step needed"']

[start]
cmd = 'npm start'
```

Create `brainbytes-multi-container/frontend/nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ['nodejs_22']

[phases.install]
cmds = ['npm install --legacy-peer-deps']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npm run start'
```

---

## 6. Service Configuration

### 6.1 Backend Service

| Setting | Configuration |
|---------|--------------|
| Source | `brainbytes-multi-container/backend` |
| Build | Dockerfile or Nixpacks |
| Port | 3000 |
| Health Check | `GET /` |
| Restart Policy | Always |

### 6.2 Frontend Service

| Setting | Configuration |
|---------|--------------|
| Source | `brainbytes-multi-container/frontend` |
| Build | Dockerfile or Nixpacks |
| Port | 3000 |
| Health Check | `GET /` |
| Restart Policy | Always |

### 6.3 MongoDB Plugin

| Setting | Configuration |
|---------|--------------|
| Plugin | MongoDB |
| Version | 7.0+ |
| Persistent | Yes (Railway-managed) |
| Internal Port | 27017 |

---

## 7. Custom Domain (Optional)

1. Railway dashboard → **Settings** → **Custom Domain**
2. Add your domain (e.g., `brainbytes.yourdomain.com`)
3. Update your DNS `CNAME` record to point to Railway's domain
4. Railway auto-provisions SSL certificate

---

## 8. Troubleshooting Common Issues

### "Connection problem detected" when chatting

This means the frontend cannot reach the backend API. Check:

1. **Is MONGO_URL set correctly?**
   → `MongoParseError: Invalid scheme` = MONGO_URL is wrong
   → `MongooseError: ... buffering timed out` = MongoDB not connected
   → **Fix**: Copy the actual `RAILWAY_MONGODB_URL` value and set `MONGO_URL` to `<value>/brainbytes`
   → Do NOT use `$(RAILWAY_MONGODB_URL)` — Railway interpolation may fail

2. **Does NEXT_PUBLIC_API_URL have a trailing slash?**
   → Should NOT end with `/`
   → Wrong: `https://backend.url/` → causes `//api/messages`
   → Correct: `https://backend.url`

3. **Check backend logs in Railway dashboard**
   → Should show: `Server running on port 3000`
   → Should show: `Connected to MongoDB`
   → If neither: check environment variables

### Backend fails to start

```
MongoParseError: Invalid scheme
→ MONGO_URL is not a valid MongoDB connection string
→ Copy the value from RAILWAY_MONGODB_URL and use it literally

Error: Cannot find module 'openai'
→ Missing npm install — push code again to trigger rebuild

GROQ_API_KEY is not set
→ Add GROQ_API_KEY to backend environment variables
```

### Deploy to Railway workflow fails

The `deploy-railway.yml` GitHub Actions workflow uses `railway up` via CLI.
If it fails:

- **RAILWAY_TOKEN expired**: Generate a new token at https://railway.app/account/tokens
- **Build fails**: Check Railway build logs for the specific error

**Recommended**: Use Railway's auto-deploy from GitHub instead:
1. Railway dashboard → Project → Settings → GitHub
2. Connect repo and enable auto-deploy on `main`
3. Every push to `main` auto-deploys — no GitHub Actions needed

---

## 9. Verification Checklist

- [ ] Railway project created and connected to GitHub
- [ ] Backend service deploys successfully
- [ ] Frontend service deploys successfully
- [ ] MongoDB plugin added and connected
- [ ] Environment variables configured in all services
- [ ] Health checks enabled and passing
- [ ] Restart policy set to "Always"
- [ ] CORS configured for production origin
- [ ] Auto-deploy on `main` branch enabled
- [ ] Logs visible in Railway dashboard
- [ ] Application accessible via Railway URL
