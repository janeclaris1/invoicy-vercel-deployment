# Step-by-Step Deployment Guide: Invoicy

This guide deploys your **backend** on Render and your **frontend** on Vercel, with MongoDB Atlas as the database.

---

## Part 1: Database (MongoDB Atlas)

### 1.1 Create a database (if you don’t have one)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign in (or create an account).
2. Create a **free cluster** (e.g. M0).
3. Click **Database** → **Connect** → **Drivers**.
4. Copy the connection string. It looks like:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```
5. Replace `<username>`, `<password>`, and `<dbname>` with your values.
6. In Atlas: **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0) so Render can connect.
7. Save this as your **MONGO_URI** (you’ll use it in Part 2).

---

## Part 2: Backend on Render

### 2.1 Create a Web Service

1. Go to [render.com](https://render.com) and sign in (or sign up with GitHub).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if needed, then select the repo: **janeclaris1/invoicy-vercel-deployment** (or your repo name).
4. Configure:
   - **Name:** e.g. `invoicy-api`
   - **Region:** Choose closest to you.
   - **Root Directory:** `Backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Advanced** and add **Environment Variables** (see 2.2).
6. Click **Create Web Service**.

### 2.2 Backend environment variables on Render

In the same Web Service, go to **Environment** and add:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `8000` (or leave blank; Render sets it) |
| `MONGO_URI` | Your MongoDB Atlas connection string from Part 1 |
| `JWT_SECRET` | A long random string (e.g. 32+ characters) |
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `ALLOWED_ORIGINS` | Your Vercel frontend URL, e.g. `https://your-app.vercel.app` (add multiple with commas if needed) |

**Required for subscriptions (so users can access the dashboard after paying):**

| Key | Value |
|-----|--------|
| `PAYSTACK_SECRET_KEY` | Your **secret** key from [Paystack Dashboard](https://dashboard.paystack.com) → Settings → API Keys (use `sk_live_...` for live or `sk_test_...` for test). Using the wrong key causes "Invalid key" and subscriptions are never created. |
| `FRONTEND_URL` | Your Vercel app URL, e.g. `https://invoicy-vercel-deployment.vercel.app` (used for payment callback URLs). |

Optional:

- `GRA_COMPANY_REFERENCE`, `GRA_SECURITY_KEY` if you use GRA.
- `LOG_LEVEL` = `info`.
- `PLATFORM_ADMIN_EMAIL` = your email so you can see "Subscribed clients" and revenue.

Save. Render will redeploy. Wait until the deploy is **Live**.

### 2.3 Get your backend URL

1. In Render, open your Web Service.
2. At the top you’ll see a URL like: `https://invoicy-api.onrender.com`
3. Copy this URL — this is your **backend URL**. You’ll use it in Part 3.

(If you see 503 at first, wait a minute; free services spin down when idle.)

---

## Part 3: Frontend on Vercel

### 3.1 Connect the repo (if not already)

1. Go to [vercel.com](https://vercel.com) and sign in.
2. **Add New** → **Project** and import your GitHub repo (e.g. **invoicy-vercel-deployment**).

### 3.2 Set Root Directory and build settings

1. In the import screen (or later in **Settings**):
   - **Root Directory:** set to `Frontend/Invoicy` (click **Edit** and enter it).
2. **Framework Preset:** Vite (should be auto-detected).
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Click **Deploy** (or save and redeploy).

### 3.3 Frontend environment variables on Vercel

1. In your Vercel project go to **Settings** → **Environment Variables**.
2. Add:

| Key | Value | Environment |
|-----|--------|-------------|
| `VITE_API_URL` | Your Render backend URL from Part 2.3 (e.g. `https://invoicy-api.onrender.com`) | Production (and Preview if you want) |

Optional: `VITE_GRA_COMPANY_REFERENCE`, `VITE_GRA_SECURITY_KEY` if you use GRA.

3. Save.
4. Go to **Deployments** → open **⋮** on the latest deployment → **Redeploy** so the new env vars are used.

---

## Part 4: Allow frontend in backend CORS

1. In **Render** → your backend service → **Environment**.
2. Set **ALLOWED_ORIGINS** to your **exact** Vercel URL, e.g.:
   ```text
   https://your-project.vercel.app
   ```
   No trailing slash. If you have multiple (e.g. www and non-www), add:
   ```text
   https://your-project.vercel.app,https://www.your-project.vercel.app
   ```
3. Save. Render will redeploy automatically.

---

## Part 5: Verify

1. Open your Vercel URL (e.g. `https://your-project.vercel.app`).
2. Try **Sign up** or **Login** — it should call the backend and work if MONGO_URI and JWT_SECRET are set.
3. If login fails:
   - Check browser **Network** tab for failed requests (red).
   - Check **Render** logs (Logs tab) and **Vercel** function/build logs.
   - Confirm **VITE_API_URL** = your Render URL and **ALLOWED_ORIGINS** = your Vercel URL.

---

## Quick checklist

- [ ] MongoDB Atlas: cluster created, MONGO_URI copied, Network Access allows 0.0.0.0/0
- [ ] Render: Web Service created, Root Directory = `Backend`, env vars set (MONGO_URI, JWT_SECRET, GEMINI_API_KEY, ALLOWED_ORIGINS)
- [ ] Backend URL copied from Render (e.g. https://invoicy-api.onrender.com)
- [ ] Vercel: Root Directory = `Frontend/Invoicy`, VITE_API_URL = backend URL
- [ ] ALLOWED_ORIGINS on Render includes your Vercel URL
- [ ] Redeploy frontend after setting VITE_API_URL

---

## Optional: Custom domain

- **Vercel:** Settings → Domains → add your domain.
- **Render:** Settings → Custom Domain → add a subdomain (e.g. `api.yourdomain.com`) and point DNS as shown.
- Update **VITE_API_URL** to the new backend URL and **ALLOWED_ORIGINS** to the new frontend URL.
