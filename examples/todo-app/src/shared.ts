export type Todo = {
  id: string
  title: string
  completed: boolean
}

export type TodoEvents = {
  'todo.create.request': {
    requestId: string
    title: string
  }
  'todo.create.accepted': Todo
  'todo.create.rejected': {
    requestId: string
    message: string
  }
}
