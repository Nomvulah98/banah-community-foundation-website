# Banah Community Foundation website

Dependency-free website built from the original Banah site. It serves only static files from `public/`.

## Run locally

Requires Node.js 24 or newer. No `npm install` is needed.

```powershell
npm start
```

Open <http://localhost:4200/>. Local runs bind to `127.0.0.1` by default.

## Production deployment on Netlify

This is a static site. In Netlify, import the GitHub repository containing this folder and use these build settings:

- Base directory: leave blank when this folder is the repository root
- Build command: leave blank
- Publish directory: `public`

The `netlify.toml` and `public/_headers` files configure the publish directory and browser security headers. Netlify provisions HTTPS for the generated site URL; enable HTTPS and HTTP-to-HTTPS redirection for any custom domain in Netlify's domain settings.

Connect the GitHub repository to the Netlify site to publish each commit to the production branch automatically. Pull requests can use deploy previews.

## Local preview

Requires Node.js 24 or newer. No `npm install` is needed.

```powershell
npm start
```

Open <http://localhost:4200/>. The optional `server.js` is for local preview; Netlify serves the static files directly and does not run the Node server.

## Security behavior

- Serves only `public/`, allows only `GET` and `HEAD`, resolves symlinks before serving, and returns no directory listings.
- Sends a restrictive Content Security Policy and standard browser security headers.
- Keeps scripts and styles in same-origin files so the CSP does not need `unsafe-inline`.
- The contact form opens a prefilled email draft in the visitor's mail app. This site does not receive or store submissions.

Before production, confirm the HTTPS redirect and custom domain are working. The original Angular source and earlier preview remain outside this repository in `../backup-original/` and `../backup-current/`.
