import {
  createBehaviorWs,
  createChainBehavior,
  createPubSubBehavior,
  type BehaviorDomForm,
} from 'chain-functions-behavior'
import { type Todo, type TodoEvents } from './shared'

type TodoState = {
  todos: Map<string, Todo>
  message: string
}

const state: TodoState = { todos: new Map(), message: '' }
const bus = createPubSubBehavior<TodoEvents>()

const getTitle = (form: BehaviorDomForm | undefined): string => {
  const value = form?.title

  return typeof value === 'string' ? value : ''
}

const render = (): void => {
  const list = document.querySelector<HTMLUListElement>('[data-todo-list]')
  const status = document.querySelector<HTMLElement>('[data-todo-status]')
  const message = document.querySelector<HTMLElement>('[data-todo-message]')

  if (list) {
    const items = [...state.todos.values()].map((todo) => {
      const item = document.createElement('li')

      item.textContent = todo.title
      return item
    })

    list.replaceChildren(...items)
  }
  if (status) {
    status.textContent = `${state.todos.size} saved tasks`
  }
  if (message) {
    message.textContent = state.message
  }
}

const clientBehavior = createChainBehavior<TodoState, unknown, TodoEvents>(
  {
    actions: {
      'todo.requestCreate': ({ input }) => {
        const form = input.form as BehaviorDomForm | undefined
        const title = getTitle(form)

        state.message = 'Sending request to the server…'
        render()
        bus.emit('todo.create.request', { requestId: crypto.randomUUID(), title }, { origin: 'client' })
      },
      'todo.applyAccepted': ({ input }) => {
        const todo = input as Todo

        state.todos.set(todo.id, todo)
        state.message = `Saved “${todo.title}” on the server.`
        render()
      },
      'todo.applyRejected': ({ input }) => {
        const rejection = input as TodoEvents['todo.create.rejected']

        state.message = rejection.message
        render()
      },
      'todo.applyLoaded': ({ runtime }) => {
        const response = runtime.data.get('todos') as { body?: { todos?: Todo[] } }

        for (const todo of response.body?.todos ?? []) {
          state.todos.set(todo.id, todo)
        }
        state.message = ''
        render()
      },
      'todo.showLoadError': () => {
        state.message = 'Could not load saved tasks. Please refresh the page.'
        render()
      },
    },
    events: {
      '[dom] [data-todo-form]:submit': { entrypoint: 'todo.requestCreate' },
      '[bus] todo.create.accepted': { entrypoint: 'todo.applyAccepted' },
      '[bus] todo.create.rejected': { entrypoint: 'todo.applyRejected' },
    },
    config: {
      entrypoints: {
        'todo.requestCreate': 'todo.requestCreate',
        'todo.applyAccepted': 'todo.applyAccepted',
        'todo.applyRejected': 'todo.applyRejected',
        'todo.load': 'todo.load',
      },
      strategies: {
        'todo.requestCreate': { fn: 'todo.requestCreate' },
        'todo.applyAccepted': { fn: 'todo.applyAccepted' },
        'todo.applyRejected': { fn: 'todo.applyRejected' },
        'todo.load': {
          fn: 'core.fetch',
          props: {
            url: '/api/todos',
            response: 'json',
            dataPath: 'todos',
            retry: { maxAttempts: 2, initialDelay: 250, maxDelay: 1_000 },
          },
          then: ['todo.applyLoaded'],
          catch: ['todo.showLoadError'],
        },
        'todo.applyLoaded': { fn: 'todo.applyLoaded' },
        'todo.showLoadError': { fn: 'todo.showLoadError' },
      },
    },
  },
  { bus, context: state }
)

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const ws = createBehaviorWs({
  bus,
  createSocket: () => new WebSocket(`${protocol}//${window.location.host}/ws`),
  inboundTopics: ['todo.create.accepted', 'todo.create.rejected'],
  outboundTopics: ['todo.create.request'],
  origin: 'ws',
  retry: { initialDelay: 250, maxDelay: 5_000 },
})

clientBehavior.start()
ws.start()
void clientBehavior.runner.run('todo.load', state, {})
