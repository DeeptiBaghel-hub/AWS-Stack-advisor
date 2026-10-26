# Deploying Stack Advisor

Three pieces, three free tiers: MongoDB Atlas (database), Render (API),
Vercel (frontend). Total time is usually 20-30 minutes the first time.

## 1. Database — MongoDB Atlas

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free "M0" cluster (any region close to you).
3. Under **Database Access**, add a database user with a username and password
   (save these — you'll need them in the connection string).
4. Under **Network Access**, add `0.0.0.0/0` ("allow access from anywhere").
   This is fine for a portfolio project; for anything handling real user data
   you'd scope this down to your API host's IP range instead.
5. Click **Connect → Drivers**, copy the connection string. It looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Add a database name before the `?`, e.g. `.../aws-stack-advisor?retryWrites=...`
6. Keep this string — it's your `MONGO_URI`.

## 2. API — Render

1. Push this repo to GitHub if you haven't already.
2. Create a free account at [render.com](https://render.com) and connect your
   GitHub account.
3. Click **New → Blueprint**, point it at your repo. Render will detect
   `render.yaml` at the root and pre-fill most settings (root directory
   `server`, build command `npm install`, start command `npm start`, health
   check on `/api/health`).
4. When prompted for environment variables, set:
   - `MONGO_URI` — the connection string from step 1
   - `JWT_SECRET` — Render can auto-generate this (`render.yaml` requests that);
     otherwise use a long random string
   - `CLIENT_ORIGIN` — leave a placeholder for now (e.g. `http://localhost:5173`),
     you'll update it after step 3
   - `GEMINI_API_KEY` — free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey);
     the app works fine without it, but the chat assistant won't respond
     until it's set
5. Deploy. Once live, copy the API's URL, something like
   `https://aws-stack-advisor-api.onrender.com`.
6. **Seed the catalog.** Render's free tier doesn't give you a persistent
   shell, so the simplest option is to run the seed script once from your own
   machine, pointed at the Atlas cluster:
   ```bash
   cd server
   MONGO_URI="<your atlas connection string>" node src/scripts/seed.js
   ```
   You should see `Seed complete: 25 created, 0 updated, 25 total in catalog.`

Note: Render's free tier spins down after inactivity, so the first request
after idle time takes ~30-60 seconds to wake up. Worth mentioning if you
demo this live — or upgrade off the free tier if that matters for your demo.

## 3. Frontend — Vercel

1. Create a free account at [vercel.com](https://vercel.com) and connect GitHub.
2. **Import Project**, select this repo, and set the **root directory** to
   `client`. Vercel auto-detects the Vite build command and output directory.
3. Add an environment variable:
   - `VITE_API_URL` = `https://<your-render-api-url>/api`
4. Deploy. Vercel gives you a URL like `https://aws-stack-advisor.vercel.app`.
   (`vercel.json` in `client/` already handles SPA routing, so refreshing on
   `/services` or `/compare` won't 404.)

## 4. Connect the two

Go back to Render, update the `CLIENT_ORIGIN` environment variable to your
real Vercel URL (so CORS allows requests from it), and redeploy the API.

## 5. Verify

- Visit your Vercel URL, run through the quiz
- Check `/services` and `/compare` load real data (confirms the seed worked
  and the frontend is talking to the right API)
- Sign up for an account and save a recommendation (confirms auth + Mongo
  writes are working end to end)

## Updating the catalog later

Edit `server/src/data/serviceCatalog.js`, then re-run the seed script against
your Atlas cluster the same way as step 2.6 — it's an upsert by `slug`, so
re-running it is always safe.

## Custom domain (optional)

Both Render and Vercel support custom domains on their free tiers under
their respective project settings — useful if you want the live demo link on
your resume to be something other than a generated subdomain.
