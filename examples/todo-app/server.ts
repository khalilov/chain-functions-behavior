import Bun, { type Server } from 'bun'
import { join } from 'node:path'
import ServeStatic from 'serve-static-bun'
import { createChainBehavior, createPubSubBehavior, type BehaviorBusEvent } from 'chain-functions-behavior'
import { build } from './build'
import { type Todo, type TodoEvents } from './src/shared'

type ServerState = {
  todos: Map<string, Todo>
}

type SocketData = {
  id: string
}

const outputDirectory = `${import.meta.dir}/dist`
const state: ServerState = { todos: new Map() }
const bus = createPubSubBehavior<TodoEvents>()

const serverBehavior = createChainBehavior<ServerState, unknown, TodoEvents>(
  {
    actions: {
      'todo.validateCreate': ({ input }) => {
        const { requestId, title } = input as TodoEvents['todo.create.request']
        const trimmedTitle = title.trim()

        if (trimmedTitle.length < 3 || trimmedTitle.length > 80) {
          bus.emit(
            'todo.create.rejected',
            { requestId, message: 'A task title must contain from 3 to 80 characters.' },
            { origin: 'server' }
          )
          return false
        }
      },
      'todo.saveCreate': ({ context, input }) => {
        const { title } = input as TodoEvents['todo.create.request']
        const todo: Todo = {
          id: crypto.randomUUID(),
          title: title.trim(),
          completed: false,
        }

        context.todos.set(todo.id, todo)
        bus.emit('todo.create.accepted', todo, { origin: 'server' })
      },
    },
    events: {
      '[bus] todo.create.request': {
        entrypoint: 'todo.create.request',
        options: { concurrency: { mode: 'queue', maxQueueSize: 100 } },
      },
    },
    config: {
      entrypoints: { 'todo.create.request': 'todo.validateCreate' },
      strategies: {
        'todo.validateCreate': {
          fn: 'todo.validateCreate',
          then: ['todo.saveCreate'],
        },
        'todo.saveCreate': { fn: 'todo.saveCreate' },
      },
    },
  },
  { bus, context: state }
)

const isCreateRequest = (event: unknown): event is BehaviorBusEvent<TodoEvents['todo.create.request']> => {
  if (typeof event === 'object' && event !== null) {
    const { topic } = event as { topic?: unknown }

    return topic === 'todo.create.request'
  }
  return false
}

const serve = async (): Promise<Server<SocketData>> => {
  const port = Number(process.env.PORT ?? 4173)
  const root = await Bun.file(join(outputDirectory, 'index.html')).text()
  const staticHandler = ServeStatic(outputDirectory, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
  const server = Bun.serve<SocketData>({
    port,
    async fetch(request, server): Promise<Response | undefined> {
      const url = new URL(request.url)

      if (url.pathname === '/ws') {
        const upgraded = server.upgrade(request, { data: { id: crypto.randomUUID() } })

        if (upgraded) {
          return undefined
        }
        return new Response('WebSocket upgrade failed', { status: 400 })
      }

      if (url.pathname === '/api/todos' && request.method === 'GET') {
        return Response.json({ todos: [...state.todos.values()] })
      }

      const response = await staticHandler(request)

      if (response.status === 404 && root) {
        return new Response(root, { headers: { 'Content-Type': 'text/html' } })
      }
      return response
    },
    websocket: {
      open(socket): void {
        socket.subscribe('todo-events')
      },
      message(_socket, message): void {
        try {
          const event = JSON.parse(String(message)) as unknown

          if (isCreateRequest(event)) {
            bus.dispatch(event)
          }
        } catch {
          // The example intentionally ignores malformed client messages.
        }
      },
    },
  })

  for (const topic of ['todo.create.accepted', 'todo.create.rejected'] as const) {
    bus.on(topic, (event) => {
      server.publish('todo-events', JSON.stringify(event))
    })
  }

  console.log(`Todo app is available at http://localhost:${server.port}`)

  return server
}

serverBehavior.start()
await build()
await serve()
