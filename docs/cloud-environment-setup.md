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
| Frontend | `brainbytes-multi-container/frontend` | Use Dockerfile (see note below) | Use Dockerfile |
| MongoDB | Use Railway's **Add Plugin** → **MongoDB** | — | — |

> **Important**: The frontend service uses a multi-stage Dockerfile for production builds. Railway will automatically detect and use the Dockerfile. Do not use Nixpacks for the frontend — delete the `nixpacks.toml` if you created one.

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
| `MONGO_URL` | `$(RAILWAY_MONGODB_URL)/brainbytes` | MongoDB connection (Railway provides the URL) |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | `3000` | Express server port |

### Frontend Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_API_URL` | `https://brainbytes-backend.up.railway.app` | Backend API URL (replace with your actual backend Railway URL) |
| `PORT` | `3000` | Next.js server port |

> **Critical**: The `NEXT_PUBLIC_API_URL` must be set **at build time** because Next.js inlines `NEXT_PUBLIC_*` variables during `npm run build`. In Railway:
> 1. Find your backend's Railway URL (e.g., `https://brainbytes-backend.up.railway.app`)
> 2. Add `NEXT_PUBLIC_API_URL=https://brainbytes-backend.up.railway.app` to the frontend service's **Variables** in Railway dashboard
> 3. Railway passes this as a build arg to the Dockerfile automatically

### Getting Your Backend URL

1. Go to Railway dashboard → select your project
2. Click on the **Backend** service
3. Look at the **Domains** section — copy the Railway-generated URL
4. Paste this URL (without trailing slash) as `NEXT_PUBLIC_API_URL` in the frontend service's variables

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

```
1. Is NEXT_PUBLIC_API_URL set correctly?
   → Railway dashboard → Frontend → Variables
   → Should be: https://brainbytes-backend.up.railway.app
   → (Replace with your actual backend Railway URL)

2. Is the backend running?
   → Railway dashboard → Backend → Logs
   → Should show: "Server running on port 3000"
   → Should show: "Connected to MongoDB"

3. Is GROQ_API_KEY set?
   → Railway dashboard → Backend → Variables
   → Should have GROQ_API_KEY set

4. Is MONGO_URL set correctly?
   → Railway dashboard → Backend → Variables
   → Should use $(RAILWAY_MONGODB_URL)/brainbytes
```

### Backend fails to start

Check backend logs in Railway dashboard:

```
Error: Cannot find module 'openai'
→ Run npm install locally and push again

MongooseServerSelectionError: connect ECONNREFUSED
→ Check MONGO_URL variable and MongoDB plugin status

Error: GROQ_API_KEY is not set
→ Add GROQ_API_KEY to backend environment variables
```

### Deploy to Railway workflow fails

The GitHub Actions deploy workflow (`deploy-railway.yml`) requires:
1. A valid `RAILWAY_TOKEN` secret in GitHub
2. The Railway CLI must have project access

**Alternative**: Skip the GitHub Actions workflow and use Railway's **auto-deploy from GitHub** instead:
1. Railway dashboard → Project → Settings → GitHub Repo
2. Enable auto-deploy on the `main` branch
3. Every push to `main` automatically deploys

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
