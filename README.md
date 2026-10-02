# Poller

A lightweight "clicker" polling app for running live multiple-choice polls in lecture.

- **Students** log in once (email username + campus ID), then scan a QR code / visit a
  persistent per-class link to answer whichever poll is currently active. Sessions are
  long-lived and there's no logout button, on purpose — see "Design notes" below.
- **Admin** (you) manages classes (create, delete-with-warning — deleting a class also
  deletes any student who ends up enrolled nowhere else), rosters (CSV import/export/
  mass-delete), and polls (create with a required label, reorder, activate one-at-a-time,
  delete-with-warning) from `/admin`. A poll can also be a **1-choice attendance
  check-in** instead of a real question — see below.

## Local development

Requirements: Node 20+. The database is a SQLite file, so there's nothing else to install.

```bash
cp .env.example .env        # then edit ADMIN_PASSWORD / SESSION_SECRET if you like
npm install
npx prisma migrate dev      # creates prisma/poller.db and the schema
npm run db:seed             # optional: demo class CS440 + 3 demo students + 1 active poll
npm run dev
```

Then visit:
- `http://localhost:3000/admin/login` — password is whatever you set as `ADMIN_PASSWORD` in `.env`.
- `http://localhost:3000/c/CS440` — student view (log in as `jdoe123` / `A10000001` if you ran the seed).

## Roster CSV format

Columns, in this order: `firstName, lastName, emailUsername, campusId`. A header row is
optional — the importer sniffs the first row and only treats it as a header if at least two
of its cells look like one of the column names above (so `firstname`/`Last Name`/`username`
all count, but a file that just starts straight into data works too):

```csv
firstName,lastName,emailUsername,campusId
Jane,Doe,jdoe123,A10000001
John,Smith,jsmith45,A10000002
```

```csv
Jane,Doe,jdoe123,A10000001
John,Smith,jsmith45,A10000002
```

Both import identically. Importing upserts: existing students (matched by `emailUsername`) get their name/campus ID
refreshed, new students are created, and everyone in the file gets enrolled in that class.
Nothing is ever removed by an import — only the explicit "Delete roster" button clears
enrollments (it leaves students and poll history untouched, so you can safely re-import a
clean roster at the start of a new semester).

## Attendance polls

Choosing **1 (attendance check-in)** when creating a poll makes it a plain "I'm here"
button instead of A-E choices — for taking attendance when there's no real question to
ask. Students just tap it; there's nothing to choose between, so the admin list, the
live-results view (a big "N of M checked in" number instead of a per-choice
breakdown), and the CSV export/roster's answered/missed counts all treat it as a
one-tap check-in rather than a multiple-choice question.

## Running it on a Mac mini (or any always-on box)

This branch uses SQLite (a single file, WAL mode) and runs as a plain `next start`
process. Load-tested at 200 students logging in, loading the poll, and answering within
a couple of seconds (and 1000 requests over 5s): zero errors, p95 under 50 ms. The
limit is Node, not the database.

1. **Install**: `git clone`, `cp .env.example .env`, then edit `.env`:
   - `DATABASE_URL="file:/Users/you/poller-data/poller.db?connection_limit=1"` — an
     absolute path outside the repo, so updates never touch your data. Keep
     `connection_limit=1`.
   - `ADMIN_PASSWORD`, and `SESSION_SECRET` (`openssl rand -base64 32`).
   - `NEXT_PUBLIC_BASE_URL` — the public https URL (this drives the QR codes).
   Then `npm ci --include=dev && npx prisma migrate deploy && npm run build`.
2. **Run as a service** (restarts on crash and at login/boot):
   ```bash
   sed "s|__REPO__|$PWD|g; s|__NPM__|$(which npm)|" deploy/com.poller.app.plist \
     > ~/Library/LaunchAgents/com.poller.app.plist
   launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.poller.app.plist
   ```
   Logs go to `poller.log` in the repo. For it to survive reboots without anyone logged
   in, enable automatic login, or convert it to a LaunchDaemon.
3. **Keep the Mac awake**: `sudo pmset -a sleep 0 disablesleep 1 autorestart 1`
   (autorestart = power back on after an outage).
4. **Public HTTPS via Cloudflare Tunnel** (no port forwarding):
   ```bash
   brew install cloudflared
   cloudflared tunnel login
   cloudflared tunnel create poller
   cloudflared tunnel route dns poller polls.example.edu     # your hostname
   ```
   Put this in `~/.cloudflared/config.yml`, then `sudo cloudflared service install`:
   ```yaml
   tunnel: poller
   credentials-file: /Users/you/.cloudflared/<tunnel-id>.json
   ingress:
     - hostname: polls.example.edu
       service: http://localhost:3000
     - service: http_status:404
   ```
   Session cookies are `secure` in production, which is fine because the tunnel serves
   HTTPS.
5. **Backups**: `deploy/backup.sh /Users/you/poller-data/poller.db /Users/you/poller-backups`
   takes a consistent online copy and prunes ones older than 14 days. Run it nightly
   (cron/launchd) and ideally sync the folder somewhere off the machine.
6. **Updating**: `deploy/update.sh` pulls, installs, migrates, rebuilds, and restarts.

Note on testing load yourself: macOS caps the TCP listen backlog at 128
(`kern.ipc.somaxconn`), so a synthetic test that opens 200+ brand-new connections in the
same instant will see resets from the OS, not the app. Real traffic through the tunnel
(a handful of long-lived connections) and real students (arriving over seconds) don't hit this.

## Design notes / known tradeoffs

- **Campus ID as password**: campus IDs aren't secret (they're on ID cards, in registrar
  systems). This is an accepted tradeoff for a low-stakes lecture poll — don't reuse this
  pattern anywhere that needs real access control.
- **No student logout**: sessions last ~180 days and there's no logout button, so a student
  can't casually switch identities to answer for a friend. This is a mild deterrent, not
  real security — clearing cookies or using a different browser bypasses it.
- **One active poll per class**: the QR code / link is stable per class (`/c/CS440`);
  toggling "Activate" on a poll in the admin UI is what changes what that link shows.
  There's no separate open/close step beyond the active toggle.
- **"Missed" polls**: computed live as *(all polls ever created for the class) −
  (polls that student answered)* — not stored, so it can't drift out of sync. This counts
  the currently-active poll too if the student hasn't answered it yet.
- **Reusing a class code across semesters**: `Class.code` is globally unique, so teaching
  CS440 again next semester means reusing the *same* class row (mass-delete the old roster,
  re-import a fresh one) rather than creating a new one — which conveniently keeps the same
  QR link stable across semesters, but also means poll history accumulates across every
  semester on that one row. "Missed" would then count a new semester's students against
  polls from a semester they were never enrolled in. Not an issue yet, but worth knowing
  before this sees a second semester of use.
