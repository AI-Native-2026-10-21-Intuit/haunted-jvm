# The Haunted JVM 🎃☕

A live, host-controlled Halloween party game for the SWE1 Week 1 recap. Players join from any browser (no accounts). The host runs it on the projector.

- 7 questions, 30 s each. Candy pops up, ghosts attack (type the spell to banish them), plus one jump scare.
- 🍬 Trick-or-treat break (30 s, 12 doors) whenever the host clicks it.
- 🏰 The Crypt Gate: write `lineTotal(price, qty)` to win the Golden Pumpkin Crown.
- 👻 Final boss: everyone slashes a 1000 HP ghost together.

## Deploy on Render (about 5 minutes)

1. Push this folder to a GitHub repo (it can be private).
2. Render dashboard → **New → Blueprint** → pick the repo. Render reads `render.yaml`.
3. When asked for `ANTHROPIC_API_KEY`, leave it empty unless you want Claude to grade the code challenge (then paste a key from console.anthropic.com).
4. Click **Apply** and wait for the deploy to go green.
5. In the service's **Environment** tab, copy the generated `HOST_KEY`.

## Run the game

| Who | Opens |
|---|---|
| Host (projector) | `https://<your-app>.onrender.com/?host=<HOST_KEY>`, then click **Host on the big screen → New game** |
| SWE1s | `https://<your-app>.onrender.com/`, then type a gamer tag and click **Join** |

The host key is removed from the address bar once the page loads, so it's safe to project.

## Good to know

- **Free plan sleeps after ~15 minutes idle.** The first visit then takes up to a minute. Open the host link 5 minutes before class.
- **State lives in memory.** A redeploy or a sleep resets the current game and the Hall of Fame. Don't redeploy mid-session.
- **Run one instance only** (the default). Several instances would each have their own separate game.
- **Players refreshing is fine:** they keep their identity, answers and candy (stored per browser).
- **Code check:** without `ANTHROPIC_API_KEY`, the built-in checker looks for `multiply`, `setScale(2, RoundingMode.HALF_UP)`, the null-price and negative-qty checks, `IllegalArgumentException`, and no `double`/`float`. It's stricter than Claude, so unusual but valid code may fail.

## Run locally

```bash
npm ci
HOST_KEY=secret node server.js
# host:    http://localhost:3000/?host=secret
# players: http://localhost:3000/
```

## Editing the game

`public/index.html` is the whole game. `tools/build.py` regenerates it from the claude.ai version (`aura-farm.html`) plus `tools/shim.js`, the small client that talks to `server.js`.
