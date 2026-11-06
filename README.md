# KS Tools

Free calculators for Kingshot players.

| Page | What it does |
|---|---|
| `/` | Home page listing the tools |
| `/hero-gear/` | Hero gear upgrade planner: best upgrade order, formations, event points, shop pack value |
| `/governor-gear/` | Governor gear planner: Satin / Gilded Threads / Artisan's Vision, set bonuses, Master's Collection chest picks |

## Structure

```
index.html              home page
hero-gear/index.html    hero gear planner
governor-gear/index.html
assets/style.css        shared styles (light and dark theme)
assets/hero-gear.js
assets/governor-gear.js
404.html
.nojekyll               serve files as-is on GitHub Pages
```

Plain HTML, CSS and JavaScript: no build step. Everything runs in the browser; inputs are saved in the visitor's browser (localStorage).

## Publishing with GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

The site is then at `https://<user>.github.io/ks-tools/`. `404.html` uses the absolute path `/ks-tools/`; change it to `/` when the site moves to its own domain.

Independent fan project, not affiliated with Kingshot or Century Games.
