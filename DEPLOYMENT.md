# Deploying to Firebase + Google Cloud Run

> **Currently deployed at:** https://iitmandicapstone26.web.app
> (GCP/Firebase project `iitmandicapstone26`, Cloud Run service
> `shift-planner-api` in `us-central1`, connected to the same Atlas cluster
> used for local dev.)

**Architecture:** the React frontend goes on **Firebase Hosting**; the Express
API goes on **Google Cloud Run** as a container. Firebase Hosting *rewrites*
`/api/**` straight to the Cloud Run service, so the browser only ever talks to
one domain — no CORS configuration needed, and it's why `axiosClient.js`
already uses a relative `baseURL: '/api'` with no code changes required.

```
Browser
  └─▶ https://your-project.web.app/          (Firebase Hosting: static React build)
  └─▶ https://your-project.web.app/api/...   (Firebase Hosting rewrite ──▶ Cloud Run)
                                                                              │
                                                                        MongoDB Atlas
```

## Prerequisites (one-time, on your machine)

```bash
# Install CLIs if you don't have them
brew install --cask google-cloud-sdk   # or see cloud.google.com/sdk/docs/install
npm install -g firebase-tools

# Authenticate both (opens a browser window)
gcloud auth login
firebase login

# Create a GCP project (skip if you already have one) and note its ID
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID

# Enable the APIs Cloud Run needs
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
```

**If `gcloud run deploy --source .` fails with a `storage.objects.get`
permission error** on a brand-new project, it's because newer GCP projects no
longer auto-grant the Editor role to the default compute service account.
Fix it once per project:

```bash
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
for role in roles/storage.objectViewer roles/artifactregistry.writer roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="$role" --condition=None --quiet
done
```

**Billing must be enabled** on the GCP project for Cloud Run, and the
Firebase project must be on the **Blaze (pay-as-you-go)** plan for Hosting
rewrites to Cloud Run to work — both have generous free tiers, but the
Spark (free) Firebase plan cannot rewrite to Cloud Run.

**MongoDB Atlas network access:** Cloud Run's outbound IP isn't static by
default, so in Atlas → Network Access, allow `0.0.0.0/0` ("Access from
Anywhere") unless you've set up a static outbound IP / VPC connector.

## 1. Deploy the backend to Cloud Run

From the `backend/` directory — this builds the Dockerfile via Cloud Build
and deploys it, no manual `docker push` needed:

```bash
cd backend

gcloud run deploy shift-planner-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars MONGO_URI="<your Atlas connection string>" \
  --set-env-vars JWT_SECRET="<a long random secret>"
```

Add these `--set-env-vars` flags too if you use them (all optional — the app
runs in demo mode without them, exactly like locally):

```bash
  --set-env-vars ANTHROPIC_API_KEY="..." \
  --set-env-vars RAZORPAY_KEY_ID="..." \
  --set-env-vars RAZORPAY_KEY_SECRET="..." \
  --set-env-vars PAYPAL_CLIENT_ID="..." \
  --set-env-vars PAYPAL_CLIENT_SECRET="..."
```

> For anything beyond a demo, put secrets in **Secret Manager**
> (`gcloud secrets create ...` + `--set-secrets` instead of `--set-env-vars`)
> rather than passing them as plain env vars on the command line.

Don't set `PORT` — Cloud Run injects it automatically and `server.js`
already reads `process.env.PORT`.

**The service name (`shift-planner-api`) and region (`us-central1`) must
match `frontend/firebase.json`'s rewrite config exactly**, or the rewrite
won't find the service.

This single command will also run once and print the service's own
`*.run.app` URL — useful for testing the API directly, but the app itself
will be reached only through the Firebase Hosting domain.

⚠️ **Same auto-migration behavior as local dev:** the container runs
`migrationService.runPending()` on every boot (see `server.js`), so the
first deploy against a fresh database will auto-run all 6 migrations —
including `006_seed_bulk_data`, which inserts 1000 fake tenants and ~10,000
fake employees (see the comment at the top of that migration file). If you
don't want that on your production database, remove or rename that
migration file before deploying, or point `MONGO_URI` at a separate database.

## 2. Point Firebase Hosting at your project

```bash
cd ../frontend
```

Edit `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID` with your actual
Firebase/GCP project ID (they must be the same project for the Hosting →
Cloud Run rewrite to work).

If `frontend/firebase.json` doesn't already exist (it does in this repo),
you'd normally generate it with `firebase init hosting` — here it's already
configured with the rewrite pointing at `shift-planner-api` / `us-central1`.

## 3. Build and deploy the frontend

```bash
npm run build
firebase deploy --only hosting
```

Firebase prints the live URL (`https://YOUR_PROJECT_ID.web.app`) when this
finishes.

## 4. Verify

```bash
curl https://YOUR_PROJECT_ID.web.app/api/health
```

Should return `{"success":true,"message":"Server is running"}`. Then open
the URL in a browser and log in with your seeded account (or register a new
organization).

## Redeploying after changes

```bash
# Backend changed:
cd backend && gcloud run deploy shift-planner-api --source . --region us-central1

# Frontend changed:
cd frontend && npm run build && firebase deploy --only hosting
```

## Costs

Both Cloud Run and Firebase Hosting have free tiers generous enough for a
demo/capstone project (Cloud Run: ~2M requests/month free; Firebase Hosting:
10GB/month transfer free). You only pay if traffic significantly exceeds
that. MongoDB Atlas's free M0 tier is enough for this app's data volume
(check its 512MB storage limit if you keep the bulk-seeded demo data from
migration `006`).
