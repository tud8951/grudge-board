# 仇人榜 · Grudge Board

A Chinese-language, full-stack list app built with Cloudflare Pages Functions and D1. The frontend is plain HTML, CSS, and JavaScript with no build step.

## Features

- Dark, red-accented responsive UI with a custom skull favicon.
- D1-backed entries, tags, ordering, and theme settings.
- Password-protected admin panel with signed, HttpOnly sessions.
- Entry editing, deletion, ordering, bulk tag assignment, and bulk import.
- Adjustable tag ordering, reflected in the public page section order.
- Optional per-entry stories (up to 10,000 characters), shown in a collapsible section on the public page.

## Project structure

```text
.
├── public/
│   ├── admin/index.html
│   ├── favicon.svg
│   └── index.html
├── functions/
│   ├── _lib/
│   └── api/
├── schema.sql
└── wrangler.toml
```

## Local development

Requirements: Node.js and [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

1. Install Wrangler and authenticate:

   ```sh
   npm install --global wrangler
   wrangler login
   ```

2. Create a D1 database and copy its UUID into `wrangler.toml` as `database_id`:

   ```sh
   wrangler d1 create grudge-board-db
   ```

3. Initialize the database (includes the optional story field):

   ```sh
   wrangler d1 execute grudge-board-db --local --file=./schema.sql
   ```

4. Create a local `.dev.vars` file (never commit it) with:

   ```dotenv
   password="your-local-admin-password"
   ```

5. Start the app:

   ```sh
   wrangler pages dev public
   ```

Open the local URL printed by Wrangler. The admin page is at `/admin/`.

## Deploy to Cloudflare Pages

1. Create a D1 database and replace the example `database_id` in `wrangler.toml` with its UUID.
2. Initialize a new production database:

   ```sh
   wrangler d1 execute grudge-board-db --remote --file=./schema.sql
   ```

   For an existing database, apply the additive story migration once before deploying the updated Functions:

   ```sh
   wrangler d1 execute grudge-board-db --remote --file=./migrations/0002_add_entry_story.sql
   ```

3. Create a Pages project named `grudge-board` and deploy from the repository root:

   ```sh
   wrangler pages project create grudge-board
   wrangler pages deploy public --project-name grudge-board
   ```

   For a Git-connected Pages project, set the build output directory to `public` and leave the build command empty. Keep `functions/` at the repository root.

4. In the Pages project settings, add a D1 binding named `DB` pointing to the database.
5. Add an encrypted Pages secret named `password` for Production (and Preview if needed). Alternatively:

   ```sh
   wrangler pages secret put password --project-name grudge-board
   ```

6. Redeploy after setting bindings and secrets. Visit `/` for the public page and `/admin/` for the admin panel.

## API

| Route | Method | Purpose |
|---|---|---|
| `/api/public` | GET | Read theme, tags, and ordered entries |
| `/api/login` | POST | Authenticate with the `password` secret |
| `/api/logout` | POST | End the admin session |
| `/api/admin/session` | GET | Check session status |
| `/api/admin/settings` | PUT | Save theme settings |
| `/api/admin/settings/reset` | POST | Restore the default theme |
| `/api/admin/tags` | POST | Create a tag |
| `/api/admin/tags` | PUT | Save the order of all tags |
| `/api/admin/entry-tags` | POST | Assign a tag to up to 500 selected entries |
| `/api/admin/entries` | POST / PUT | Create an entry / save entry order |
| `/api/admin/entries/:id` | PATCH / DELETE | Edit / delete an entry, including its optional story |
| `/api/admin/bulk` | POST | Import up to 500 `name+description` lines |

Admin sessions use signed, `HttpOnly`, `Secure`, `SameSite=Strict` cookies. Keep the `password` secret private; changing it invalidates existing sessions.

## License

Released under the [MIT License](./LICENSE).
