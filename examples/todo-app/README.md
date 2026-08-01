# CFB client/server Todo example

Runnable example with two independent CFB runtimes launched by one Bun process:

1. The browser runtime turns form input into `todo.create.request`.
2. The server runtime validates the title, saves an accepted task in an in-memory `Map`, and emits either `todo.create.accepted` or `todo.create.rejected`.
3. On startup, the browser uses `core.fetch` to load the current todo list from `GET /api/todos`; the response is stored in runtime data and applied by the next strategy.

The client WebSocket bridge forwards only requests outward and server responses inward.

```sh
npm run build
cd examples/todo-app
bun install
bun run dev
```

Open `http://localhost:4173`, submit a title shorter than three characters, then submit a valid title. The message below the form shows the server result. Server state is intentionally in memory and resets when Bun stops.

The client runtime is in `src/app.ts`; the server runtime is in `server.ts`. `build.ts` always writes the browser app into `dist`, relative to the example directory rather than the command's working directory.
