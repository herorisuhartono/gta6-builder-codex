# Marrow Bay | Low Tide

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/competitions/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/herorisuhartono/gta6-builder-codex/rank.svg)](https://make.fun/competitions/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/herorisuhartono/gta6-builder-codex/reward.svg)](https://make.fun/competitions/gta6-01)

An original, offline WebGL crime game set in a coastal city in 1989. Dock dispatcher Inez Sol has a copy of the ledger that links port boss Lennox Vale to the missing seawall repair fund.

Run `node serve.ts` with Node 22.18 or later, then open http://localhost:8080 in a desktop browser with WebGL. The game needs no build or external assets. Progress is saved to the browser after contracts, on arrest, and when you pause.

| Input | On foot | In a car |
| --- | --- | --- |
| W A S D | Move | Accelerate, steer, brake and reverse |
| Shift | Sprint | Nitro |
| Space | Jump | Handbrake and drift |
| E or F | Enter nearby car | Exit at low speed |
| Mouse or left/right arrows | Orbit camera | Free-look with automatic recentering |
| Right mouse button | Aim over the right shoulder | Free-look |
| 1 / 2 | Select pistol or Micro-SMG | Select weapon |
| V |  | Cycle close, far, and hood cameras |
| Left mouse button | Fire the equipped weapon | Capture mouse |
| Escape | Pause | Pause |

Follow the amber radar dot to the promenade, the docks, the radio station, and the boulevard race. A cyan gate guides the active race. Keep clear of patrols to lose stars. The Osprey unlocks at $500 and the Kestrel GT at $1,100. Parked faster cars are available on Canary Boulevard.

At one star, foot officers join the patrol cars. At three stars an air unit searches with a spotlight and fires bursts after sustained exposure. Officers drop cash, ammunition, and health. If you are wasted, you wake up outside Mercy Hospital.

The world, vehicles, art, and sounds are generated in code. Source is MIT licensed. `node main.ts` uses the official Make.fun dossier builder. Set `MAKEFUN_OUTPUT_DIR` when running it outside the competition grader.
