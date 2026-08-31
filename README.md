# The Case File — v2

The site is now split into a public case library and a private Studio.

## Vercel environment variables
Set these on the Vercel project before merging/deploying:

- `STUDIO_PASSWORD` — private Studio login password.
- `STUDIO_SESSION_SECRET` — long random secret used to sign the session cookie.
- `GITHUB_TOKEN` — fine-grained token with Contents read/write for `meeth10/Case_book` only.
- `GITHUB_OWNER` — `meeth10`
- `GITHUB_REPO` — `Case_book`
- `GITHUB_BRANCH` — `main`
- `GITHUB_DATA_PATH` — `data/cases.json`
- `BLOB_READ_WRITE_TOKEN` — connect a Vercel Blob store to the project.

## Local development
Install dependencies and use the Vercel local server so `/api` functions work:

`npm install`

`vercel dev`

## Operating model
Cases are stored in `data/cases.json`. Large attachments are uploaded directly from the browser to Vercel Blob via a secure client-upload token exchange, then their public URLs are saved against the case. This avoids Vercel Function request limits for larger PDFs.

The browser never receives or stores the GitHub write token.
