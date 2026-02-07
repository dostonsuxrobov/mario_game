# Star Hopper

A lightweight platformer built from scratch with plain HTML, CSS, and JavaScript. It runs fully client-side, so it's ready to host on GitHub Pages without any build step.

## Play locally

Open `index.html` directly in a browser, or run a local static server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Controls

- **A / D** or **Left / Right arrows**: Move
- **W / Space / Up arrow**: Jump
- **Enter**: Start/restart when the overlay is visible

## Objective

Collect all 12 stars before the timer ends while avoiding slimes and falling into pits.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set source to **Deploy from a branch**.
4. Choose your branch (for example `main`) and root (`/`).
5. Save, then open the generated GitHub Pages URL.
