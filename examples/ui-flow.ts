import { createBehaviorRunner, defineBehaviorConfig } from '~/index'

interface UiContext {
  modal: 'buyOre' | null
}

export const uiBehavior = defineBehaviorConfig({
  version: 1,
  entrypoints: { 'settings.save.click': 'settings.save.click' },
  strategies: {
    'settings.save.click': {
      fn: 'ui.validateSettings',
      then: ['settings.persist', 'ui.closeModal', 'ui.showMessage'],
      catch: ['ui.showError'],
    },
    'settings.persist': { fn: 'settings.persist' },
    'ui.closeModal': { fn: 'core.patch', props: { patch: { type: 'ui.modal.closed' } } },
    'ui.showMessage': { fn: 'core.emit', props: { type: 'ui.message', payload: { text: 'Settings saved' } } },
    'ui.showError': { fn: 'core.emit', props: { type: 'ui.error', payload: { text: 'Could not save settings' } } },
  },
})

export const createUiRunner = () => {
  const runner = createBehaviorRunner<UiContext>()
  runner.loadConfig(uiBehavior)
  return runner
}
