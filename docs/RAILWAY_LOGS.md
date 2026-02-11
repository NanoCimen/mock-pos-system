# Railway logs – what they mean and what was fixed

## Postgres SSL messages (`could not accept SSL connection`)

Those lines come from **Postgres itself**, not from the mock-pos-system app. They usually mean another client (e.g. Railway dashboard, a different service, or an old client using TLS 1.0/1.1) tried to connect and the TLS handshake failed.

- **mock-pos-system** uses Node `pg` with TLS 1.2+ and `rejectUnauthorized: false`, and logs `✔ Connected to PostgreSQL database` when it connects successfully.
- So you can see both: Postgres SSL errors from other clients, and successful connections from mock-pos-system. The app is configured to use the internal DB URL when on Railway and SSL options that work with Railway’s Postgres.

You can ignore the Postgres SSL errors unless your app stops connecting. If it does, check that `DATABASE_URL` (or `DATABASE_PUBLIC_URL`) is set and that the app uses the internal URL on Railway when possible.

## `npm error signal SIGTERM` / `command sh -c tsx src/index.ts`

That means the Node process was stopped by a **SIGTERM** (e.g. deploy, restart, or platform scaling). It’s normal for the process to exit when it receives SIGTERM.

**What was changed:**

- **Graceful shutdown** – On SIGTERM/SIGINT the app now:
  1. Stops accepting new HTTP requests
  2. Closes the PostgreSQL pool
  3. Exits with code 0

So when Railway sends SIGTERM, the app shuts down cleanly instead of being killed mid-request, and the next deploy or restart can start without leaving the process in a bad state.

## If the app keeps crashing

1. Check **Railway** → your service → **Variables**: `DATABASE_URL` or `DATABASE_PUBLIC_URL`, `PORT`, `POS_API_KEY`.
2. Check **Deploy** or **Build** logs for errors before the SIGTERM (e.g. missing env, build failure).
3. Confirm **Start command** is `npm start` (runs `tsx src/index.ts`).
