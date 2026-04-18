 # ultrahax — Copilot Instructions

## Project Overview

Step-based pipeline runner framework (Python 3.11+) paired with a Node.js stadium generator for HaxBall `.json` stadium files.

## Tech Stack

- **Python 3.11+** — pipeline framework (`src/ultrahax/`)
- **Node.js** — stadium generator (`stadium_generator.js`, uses `js-yaml`)
- **Package manager**: pip (editable install via `pyproject.toml`), npm for JS deps
- **No test framework yet** — `test/` directory exists but is empty

## Project Structure

```
src/ultrahax/
  main.py              — CLI entry point (run-pipeline command)
  core/
    runner.py          — Pipeline executor (sequential steps, verbose/dry_run/stop_on_error)
    config.py          — YAML config loader
    paths.py           — Directory path constants
    utils.py           — Interactive file chooser helper
  pipelines/<name>/
    config.yaml        — Pipeline definition (steps, input/output, settings)
    registry.py        — Maps step names → run() callables
    steps/
      step_NN_name.py  — Each step exports run(context: dict) -> dict

stadium_generator.js   — YAML templates → .json stadiums (inverse of smoothie pipeline)

headless/
  room.js              — HaxBall headless host script (room creation, custom stadium, chat commands)

data/
  dirty_json/          — Raw .json stadium input files
  dirty_yamls/         — Smoothie pipeline output
  final_templates/     — Curated YAML templates for JS generator
  generated_stadiums/  — JS generator output .json files
  samples/             — Example HaxBall maps
```

## Conventions

### Pipeline Steps
- Every step is a module with `def run(context: dict) -> dict`
- Steps receive and return a shared mutable context dict
- Step file naming: `step_NN_description.py` (NN = zero-padded order)
- Registry maps short names (e.g. `"01_collect_json_files"`) to `step_module.run`

### Config YAML Schema
```yaml
name: pipeline_name
description: ...
enabled: true
verbose: true
version: 1
input: { source_dir: ..., pattern: "*.json" }
output: { target_dir: ..., overwrite: true }
settings: { stop_on_error: true, dry_run: false }
context: { initial_values: {} }
steps:
  - name: "01_step_name"
    enabled: true
```

### Code Style
- Type hints on function signatures (use `dict`, `list`, `str | None` — not `Optional`)
- No docstrings unless complex logic warrants it
- Raise specific exceptions (`ValueError`, `FileNotFoundError`) with clear messages
- Use `pathlib.Path` for all filesystem operations in Python
- Use `yaml.safe_load` for reading YAML

### Naming
- Python: `snake_case` for everything (files, functions, variables)
- JS: `camelCase` for functions/variables, file names use `snake_case`
- Pipeline dirs use `snake_case`

## HaxBall Domain Reference

### Wikis
- [Chat Commands](https://github.com/haxball/haxball-issues/wiki/Chat-Commands)
- [Stadium File](https://github.com/haxball/haxball-issues/wiki/Stadium-(.hbs)-File)
- [Collision Flags](https://github.com/haxball/haxball-issues/wiki/Collision-Flags)
- [Headless Host](https://github.com/haxball/haxball-issues/wiki/Headless-Host)

### Key Facts
- Stadium files are **valid JSON** (`.json` extension)
- Stadium objects have specific field types: `bg`, `traits`, `playerPhysics`, `ballPhysics` (objects); `vertexes`, `segments`, `goals`, `discs`, `planes`, `joints` (arrays)
- `cMask` and `cGroup` are collision flag fields (string or array of strings)

### Headless API — Read (available every tick, 60fps)
| Method | Returns |
|--------|---------|
| `getBallPosition()` | `{x, y}` of ball (null if no game) |
| `getDiscProperties(discIndex)` | Full disc info: `x, y, xspeed, yspeed, xgravity, ygravity, radius, bCoeff, invMass, damping, color, cMask, cGroup` |
| `getPlayerDiscProperties(playerId)` | Same as getDiscProperties but for a player's disc |
| `getPlayer(id)` | `{id, name, team, admin, position}` |
| `getPlayerList()` | Array of PlayerObjects with positions |
| `getScores()` | `{red, blue, time, scoreLimit, timeLimit}` (null if no game) |
| `getDiscCount()` | Number of discs (ball + players + stadium discs) |

### Headless API — Write
| Method | Effect |
|--------|--------|
| `setDiscProperties(discIndex, props)` | Move/stop ball (disc 0) or any disc — set `{x, y, xspeed, yspeed, cMask, cGroup}` etc. Null props are preserved |
| `setPlayerDiscProperties(playerId, props)` | Move/modify a player's disc (position, speed, collision flags) |
| `setPlayerTeam(playerId, team)` | Move player to team (0=spec, 1=red, 2=blue) |
| `setPlayerAdmin(playerId, bool)` | Grant/revoke admin |
| `setPlayerAvatar(playerId, avatar)` | Override player avatar (null to clear) |
| `sendAnnouncement(msg, targetId?, color?, style?, sound?)` | Host announcement — styles: `"normal","bold","italic","small","small-bold","small-italic"`, sound: 0=none, 1=chat, 2=notification |
| `sendChat(msg, targetId?)` | Chat message as host player |
| `kickPlayer(playerId, reason, ban)` | Kick/ban player |
| `pauseGame(bool)` | Pause/unpause |
| `startGame()` / `stopGame()` | Start/stop game |
| `setScoreLimit(int)` / `setTimeLimit(minutes)` | Change limits (no effect mid-game) |
| `setCustomStadium(json)` / `setDefaultStadium(name)` | Change stadium (no effect mid-game) |
| `setTeamsLock(bool)` | Lock/unlock team changes |
| `setTeamColors(team, angle, textColor, colors[])` | Set team colors |
| `setKickRateLimit(min, rate, burst)` | Kick rate limiting |
| `reorderPlayers(playerIdList, moveToTop)` | Reorder player list |
| `CollisionFlags` | Flag constants: `ball, red, blue, redKO, blueKO, wall, all, kick, score, c0, c1, c2, c3` |

### Headless API — Events
| Event | Signature | Notes |
|-------|-----------|-------|
| `onGameTick` | `() → void` | 60fps, not called when paused/stopped |
| `onPlayerBallKick` | `(player) → void` | Player kicked the ball |
| `onTeamGoal` | `(team) → void` | Goal scored |
| `onPositionsReset` | `() → void` | After goal, positions reset |
| `onPlayerJoin` | `(player) → void` | Player joined |
| `onPlayerLeave` | `(player) → void` | Player left |
| `onPlayerChat` | `(player, msg) → bool` | Return false to suppress message |
| `onTeamVictory` | `(scores) → void` | Team won the game |
| `onGameStart` | `(byPlayer) → void` | Game started (byPlayer can be null) |
| `onGameStop` | `(byPlayer) → void` | Game stopped |
| `onPlayerTeamChange` | `(changed, byPlayer) → void` | Team changed |
| `onPlayerAdminChange` | `(changed, byPlayer) → void` | Admin changed |
| `onPlayerKicked` | `(kicked, reason, ban, byPlayer) → void` | After onPlayerLeave |
| `onGamePause` | `(byPlayer) → void` | Game paused |
| `onGameUnpause` | `(byPlayer) → void` | Game unpaused (timer before real unpause) |
| `onPlayerActivity` | `(player) → void` | Key press detected |
| `onStadiumChange` | `(name, byPlayer) → void` | Stadium changed |
| `onRoomLink` | `(url) → void` | Room URL obtained |

### Headless API — Limitations
- All state-modifying methods execute **asynchronously** — immediate reads may return stale data
- No event for "ball crossed line" — must check position in `onGameTick`
- No player facing direction info
- `setCustomStadium` / `setDefaultStadium` / `setScoreLimit` / `setTimeLimit` do nothing mid-game
- `PlayerObject.auth` and `conn` only available in `onPlayerJoin`

## Commands

```bash
# Run a pipeline
run-pipeline smoothie
run-pipeline count_to_five

# Generate stadium from YAML template
node stadium_generator.js [template.yaml] [output.json]

# Run headless host (info mode in Node, real use in browser)
node headless/room.js
```