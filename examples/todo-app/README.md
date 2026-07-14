# CFB Todo App

Runnable browser example for CFB DOM bindings, synthetic bus events, and the WebSocket bridge.

```sh
npm run build
cd examples/todo-app
bun install
bun run dev
```

Open two browser tabs at `http://localhost:4173`: tasks created, toggled, or removed in one tab are propagated to the other through CFB event envelopes.

`src/app.ts` deliberately keeps state, actions, behavior config, bindings, and transport setup together so the full flow is visible in one file.
