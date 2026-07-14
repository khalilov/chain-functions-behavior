import Bun, { type Server } from 'bun'
import { join } from 'node:path'
import ServeStatic from 'serve-static-bun'
import { build } from './build'

type SocketData = {
  id: string
}

const serve = async (): Promise<Server<SocketData>> => {
  const port = Number(process.env.PORT ?? 4173)
  const directory = './build'
  const root = await Bun.file(join(directory, 'index.html')).text()
  const staticHandler = ServeStatic(directory, {
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

      try {
        const response = await staticHandler(request)

        if (response.status === 404 && root) {
          return new Response(root, { headers: { 'Content-Type': 'text/html' } })
        }
        return response
      } catch {
        return new Response('Internal Server Error', { status: 500 })
      }
    },
    websocket: {
      open(socket): void {
        socket.subscribe('todo-events')
      },
      message(socket, message): void {
        server.publish('todo-events', message)
      },
    },
  })

  console.log(`Todo app is available at http://localhost:${server.port}`)

  return server
}

await build()
await serve()
