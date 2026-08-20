# OCI VPS deployment

This deployment serves the Vite build with Caddy and runs only the Express API under PM2. MongoDB and media remain managed by the existing MongoDB provider and Cloudinary.

## One-time VPS preparation

1. Point the production domain's `A` record at the OCI public IP. Add an `AAAA` record only when IPv6 is configured. Allow inbound TCP 22, 80, and 443 in both the OCI security list/NSG and host firewall; do not expose port 5000.
2. Use the existing Node.js 22.23.1 runtime for a dedicated unprivileged application user. Ensure that user's `node`, `npm`, and `pm2` paths are available to systemd.
3. Create `/srv/naughty-jars/releases`, owned by the application user, and `/etc/naughty-jars/backend.env`, owned by that user with mode `0600`. Populate the environment file from `.env.example` using production values. Use a newly generated JWT secret.
   Rotate the MongoDB, JWT, and Cloudinary credentials that existed in the previously committed `nj.zip` archive before deploying; deleting the archive from the current tree does not remove it from Git history.
4. Add the OCI egress IP to the managed MongoDB network allowlist. Confirm the provider's backup policy and take an on-demand backup before cutover.
5. Copy `deploy/Caddyfile` to `/etc/caddy/Caddyfile`. Create the log directory with `sudo install -d -o caddy -g caddy /var/log/caddy`, then add a systemd override with `sudo systemctl edit caddy`:

   ```ini
   [Service]
   Environment=NAUGHTY_JARS_SITE_ADDRESS=example.com
   ```

   Replace the hostname, run `sudo systemctl daemon-reload`, validate with `sudo -u caddy env NAUGHTY_JARS_SITE_ADDRESS=example.com caddy validate --config /etc/caddy/Caddyfile`, and reload Caddy. Caddy must be able to traverse `/srv/naughty-jars/current/frontend/dist`.
6. Run `pm2 startup` as the application user, execute the generated privileged command, and run `pm2 save`. Re-run the startup setup after changing the installed Node.js major version.
7. Configure a read-only GitHub deploy key for each repository. The default repository URLs in `deploy.sh` use SSH.

If `www` should redirect to the apex domain, add a separate Caddy site block:

```caddyfile
www.example.com {
    redir https://example.com{uri} permanent
}
```

## Legacy media gate

Before the first VPS cutover, install/build the backend and run:

```bash
ENV_FILE=/etc/naughty-jars/backend.env npm run audit:media
```

The command reports every MongoDB image URL beginning with `/uploads/` and whether its tracked file can be found. Review the report, restore any missing files, then migrate references:

```bash
ENV_FILE=/etc/naughty-jars/backend.env npm run migrate:media
ENV_FILE=/etc/naughty-jars/backend.env npm run audit:media -- --require-clean
```

Do not cut over while the clean check fails. After a clean report and a verified MongoDB backup, the obsolete tracked upload directories can be deleted in a separate commit. The old `nj.zip` archive has already been removed because it contained an environment file; coordinate a Git-history purge separately after rotating every exposed credential.

## Deploy and rollback

Make the scripts executable after checkout. Deploy exact refs when possible:

```bash
SITE_URL=https://example.com \
FRONTEND_REF=<frontend-commit-or-tag> \
BACKEND_REF=<backend-commit-or-tag> \
./deploy/deploy.sh
```

The script builds in a new release, runs backend tests and the clean-media gate, switches one atomic symlink, reloads PM2, checks MongoDB readiness, and rolls back automatically on failure. It keeps the three newest releases.

Manual rollback uses the saved previous symlink:

```bash
./deploy/rollback.sh
```

## Cutover and operations

- Lower DNS TTL before cutover. Verify the home page, a deep React route, `/api/health/live`, `/api/health/ready`, login, registration, admin CRUD, likes, testimonials, filters, uploads, and WhatsApp checkout over HTTPS.
- Keep Render online for 48 hours after DNS changes. Because both services use the same MongoDB database and Cloudinary account, DNS rollback is safe during this window. Remove Render and rotate obsolete platform secrets after the window.
- Inspect `pm2 logs naughty-jars-api`, `pm2 status`, the Caddy JSON access log, and `journalctl -u caddy`. Install/configure `pm2-logrotate` or an equivalent host log rotation policy.
- Reboot once during acceptance testing and verify that Caddy and the PM2 process return without manual intervention.
