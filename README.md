# KS Tools

Free calculators for Kingshot players.

| Page | What it does |
|---|---|
| `/` | Home page listing the tools |
| `/hero-gear/` | Hero gear upgrade planner: best upgrade order, formations, event points, shop pack value |
| `/reforge/` | Hero gear reforge planner: list every piece you own, keep the best per troop and slot for your 3 main heroes, reforge the rest and spend the refunds |
| `/truegold/` | Truegold planner: TG levels of the 8 Truegold buildings, Truegold / Tempered Truegold / time to a goal, Super Refinement plans |
| `/governor-gear/` | Governor gear planner: Satin / Gilded Threads / Artisan's Vision, set bonuses, Master's Collection chest picks |

## Structure

```
index.html              home page
hero-gear/index.html    hero gear planner
reforge/index.html      hero gear reforge planner
truegold/index.html     truegold planner
governor-gear/index.html
assets/style.css        shared styles (light and dark theme)
assets/hero-gear-model.js  hero gear data and optimizer (shared by hero-gear and reforge)
assets/hero-gear.js
assets/reforge.js
assets/truegold-data.js  building steps level 30 to TG8 (from Kingshot Optimizer)
assets/truegold.js
assets/governor-gear.js
404.html
.nojekyll               serve files as-is on GitHub Pages
```

Plain HTML, CSS and JavaScript: no build step. Everything runs in the browser; inputs are saved in the visitor's browser (localStorage).

## Publishing with GitHub Pages

Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

The site is then at `https://<user>.github.io/ks-tools/`. `404.html` uses the absolute path `/ks-tools/`; change it to `/` when the site moves to its own domain.

Independent fan project, not affiliated with Kingshot or Century Games.
