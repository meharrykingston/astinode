1. Overview
This backend is a Fastify API with MongoDB. It serves SEO pages, superadmin authentication, SEO user management, SEO login, logging, and scheduled jobs. JWT is used for session tokens and admin routes require a superadmin role.

2. Folder structure
The folder src routes contains the HTTP routes for pages, auth, admin, and logs. The folder src models contains Mongoose schemas for pages, users, and logs. The folder src services contains cron jobs, log utilities, and seed logic for the initial superadmin. The folder src utils contains JWT and password helpers along with a small auth middleware.

3. Environment
Set MONGODB_URI for database access. Set JWT_SECRET for token signing. Set SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD to seed the initial superadmin record on first boot. Set DEFAULT_SEO_EMAIL and DEFAULT_SEO_PASSWORD to seed an SEO user for IndexControl login. Set SITE_URL to the frontend base URL used by the sitemap job. The root path returns a health payload so Railway does not show a 404 at the base URL.

4. Public API routes
The pages API serves SEO data to the frontend. It includes endpoints for listing pages, resolving a slug, counting pages, creating and updating pages, bulk upload, and bulk delete. Bulk upload expects a JSON array of page rows (CSV is converted on the frontend). A logs ingestion endpoint accepts frontend events.

5. Superadmin and SEO API routes
The auth API provides login for the superadmin and SEO panel users. The admin API provides summary metrics, SEO user creation, update, delete, password reset, log listing, and manual job triggers. The SEO auth me endpoint returns the active user profile for session refresh.

6. Logging API
The logs ingestion endpoint accepts frontend events and stores them in the logs collection. Logs are labeled by level and source and are available in the superadmin dashboard.

7. Scheduled jobs
Two daily jobs are scheduled. One triggers sitemap generation by requesting the frontend sitemap endpoint. The other cleans logs by removing info and warn entries older than the retention window while keeping error entries.

8. Local setup
Install dependencies and run the dev server.

npm install
npm run dev

9. Health endpoints
The root path returns a short health response. The status route returns database connectivity and service metadata.

10. Google integrations
The backend is prepared for Google Search Console and Google Business Profile integrations. Configuration is stored in MongoDB and endpoints are protected by superadmin JWT. External API calls are stubbed until credentials are wired. GSC endpoints include status, config, top queries, and sitemap submission. GMB endpoints include status, config, and location listing.
