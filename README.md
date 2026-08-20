# Naughty Jars API

Express 5 and TypeScript API backed by MongoDB/Mongoose. Product, crew, and blog media is stored in Cloudinary.

## Local development

Use Node.js 22.23.1 or a newer Node 22 release, copy `.env.example` to `.env`, supply the required credentials, and run:

```bash
npm ci
npm run dev
```

The API listens on `127.0.0.1:5000` by default. The frontend Vite server proxies `/api` to this address.

## Checks

```bash
npm test
npm run build
npm audit --omit=dev
```

`GET /api/health/live` reports process liveness. `GET /api/health/ready` returns 200 only while MongoDB is connected.

## Administrative scripts

- `npm run seed:admin` creates the first administrator from `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. It does not contain default credentials.
- `npm run seed:products` replaces all products and therefore also requires `ALLOW_DESTRUCTIVE_SEED=true`.
- `npm run audit:media` reports legacy `/uploads/` database references. Review its output before using `npm run migrate:media`.

The OCI, Caddy, PM2, release, rollback, and Render cutover instructions are in [`deploy/README.md`](deploy/README.md).
