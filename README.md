# devhost-plugin-session-stop

A [devhost](https://github.com/bankyadam/devhost.app) plugin that frees memory by stopping the local `claude` process of a Remote Control session (a few hundred MB each).

It only stops a process that a devhost Remote Control service started (its child) and whose working directory is the session's: never the Claude app's sessions or anything else. SIGTERM, then SIGKILL after 5 s. The session stays in claude.ai's list; a new message there may start it again. With `spawn: same-dir`, several sessions share a directory: it refuses and says to stop the environment's service instead.

## Install

```sh
devhost plugin install git@github.com:bankyadam/devhost-plugin-session-stop.git --enable
```

or in the desktop app: Plugins → Install from GitHub…

## Use

```sh
devhost plugin run session-stop stop --session <id or its first 8 characters> [--dry-run]
```

It asks first (`--yes` answers). In the app: Dashboard → a session's **Open** menu → *Stop the session process…*

## Development

Plain ES module, no build. It uses only the devhost plugin API (the `ctx` argument) and Node's own modules. `npm test` runs the tests against a scripted context (`test/fake.js`).
