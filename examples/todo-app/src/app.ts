import {
  createBehaviorWs,
  createChainBehavior,
  createPubSubBehavior,
  type BehaviorDomForm,
} from 'chain-functions-behavior'
import { pick } from 'objwalk'

type Todo = {
  id: string
  title: string
  completed: boolean
}

type TodoEvents = {
  'todo.created': Todo
  'todo.toggled': Pick<Todo, 'id' | 'completed'>
  'todo.removed': Pick<Todo, 'id'>
}

type TodoState = {
  todos: Map<string, Todo>
}

const state: TodoState = { todos: new Map() }
const bus = createPubSubBehavior<TodoEvents>()

const getFormValue = (form: BehaviorDomForm | undefined, name: string): string => {
  const value = form?.[name]

  return typeof value === 'string' ? value.trim() : ''
}

const render = (): void => {
  const list = document.querySelector<HTMLUListElement>('[data-todo-list]')
  const status = document.querySelector<HTMLElement>('[data-todo-status]')

  if (list) {
    const items = [...state.todos.values()].map((todo) => {
      const item = document.createElement('li')
      const toggle = document.createElement('input')
      const title = document.createElement('span')
      const remove = document.createElement('button')

      item.className = todo.completed ? 'todo todo-completed' : 'todo'
      toggle.type = 'checkbox'
      toggle.checked = todo.completed
      toggle.dataset.todoToggle = todo.id
      title.textContent = todo.title
      remove.type = 'button'
      remove.dataset.todoRemove = todo.id
      remove.textContent = 'Remove'

      item.append(toggle, title, remove)
      return item
    })

    list.replaceChildren(...items)
  }
  if (status) {
    const completed = [...state.todos.values()].filter((todo) => todo.completed).length

    status.textContent = `${state.todos.size} tasks, ${completed} completed`
  }
}

const behavior = createChainBehavior<TodoState, unknown, TodoEvents>(
  {
    actions: {
      'todo.requestCreate': ({ input }) => {
        const form = input.form as BehaviorDomForm | undefined
        const title = getFormValue(form, 'title')

        if (title) {
          bus.emit('todo.created', { id: crypto.randomUUID(), title, completed: false }, { origin: 'ui' })
        }
      },
      'todo.requestToggle': ({ input }) => {
        const id = pick(input, 'dataset.todoToggle')
        const todo = typeof id === 'string' ? state.todos.get(id) : undefined

        if (todo) {
          bus.emit('todo.toggled', { id: todo.id, completed: !todo.completed }, { origin: 'ui' })
        }
      },
      'todo.requestRemove': ({ input }) => {
        const id = pick(input, 'dataset.todoRemove')

        if (typeof id === 'string') {
          bus.emit('todo.removed', { id }, { origin: 'ui' })
        }
      },
      'todo.addSynthetic': () => {
        bus.emit(
          'todo.created',
          { id: crypto.randomUUID(), title: 'Synthetic event from an API callback', completed: false },
          { origin: 'api' }
        )
      },
      'todo.applyCreated': ({ input }) => {
        const todo = input as Todo

        state.todos.set(todo.id, todo)
        render()
      },
      'todo.applyToggled': ({ input }) => {
        const update = input as TodoEvents['todo.toggled']
        const todo = state.todos.get(update.id)

        if (todo) {
          state.todos.set(update.id, { ...todo, completed: update.completed })
          render()
        }
      },
      'todo.applyRemoved': ({ input }) => {
        const update = input as TodoEvents['todo.removed']

        state.todos.delete(update.id)
        render()
      },
    },
    events: {
      '[dom] [data-todo-form]:submit': { entrypoint: 'todo.requestCreate' },
      '[dom] [data-todo-toggle]:click': { entrypoint: 'todo.requestToggle' },
      '[dom] [data-todo-remove]:click': { entrypoint: 'todo.requestRemove' },
      '[dom] [data-todo-synthetic]:click': { entrypoint: 'todo.addSynthetic' },
      '[bus] todo.created': { entrypoint: 'todo.applyCreated' },
      '[bus] todo.toggled': { entrypoint: 'todo.applyToggled' },
      '[bus] todo.removed': { entrypoint: 'todo.applyRemoved' },
    },
    config: {
      entrypoints: {
        'todo.requestCreate': 'todo.requestCreate',
        'todo.requestToggle': 'todo.requestToggle',
        'todo.requestRemove': 'todo.requestRemove',
        'todo.addSynthetic': 'todo.addSynthetic',
        'todo.applyCreated': 'todo.applyCreated',
        'todo.applyToggled': 'todo.applyToggled',
        'todo.applyRemoved': 'todo.applyRemoved',
      },
      strategies: {
        'todo.requestCreate': { fn: 'todo.requestCreate' },
        'todo.requestToggle': { fn: 'todo.requestToggle' },
        'todo.requestRemove': { fn: 'todo.requestRemove' },
        'todo.addSynthetic': { fn: 'todo.addSynthetic' },
        'todo.applyCreated': { fn: 'todo.applyCreated' },
        'todo.applyToggled': { fn: 'todo.applyToggled' },
        'todo.applyRemoved': { fn: 'todo.applyRemoved' },
      },
    },
  },
  { bus, context: state }
)

const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const ws = createBehaviorWs({
  bus,
  createSocket: () => new WebSocket(`${protocol}//${window.location.host}/ws`),
  inboundTopics: ['todo.created', 'todo.toggled', 'todo.removed'],
  outboundTopics: ['todo.created', 'todo.toggled', 'todo.removed'],
  origin: 'ws',
  retry: { initialDelay: 250, maxDelay: 5_000 },
})

behavior.start()
ws.start()

queueMicrotask(() => {
  bus.emit(
    'todo.created',
    { id: crypto.randomUUID(), title: 'Synthetic task created after startup', completed: false },
    { origin: 'api' }
  )
})
