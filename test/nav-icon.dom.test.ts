// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { installRoutingNavIcon } from '../src/client/nav-icon.js'
it('spec Scenario "The navigation icon only affects its own section"', async () => {
  document.body.innerHTML = '<div role="dialog"><nav><button><svg></svg>Auto model routing</button><button><svg></svg>Other</button></nav></div><nav><button>Auto model routing</button></nav>'
  const dispose = installRoutingNavIcon(document)
  expect(document.querySelectorAll('[data-amr-nav]')).toHaveLength(1)
  const own = document.querySelector('[data-amr-nav]')!
  own.textContent = 'Other'
  await new Promise(resolve => queueMicrotask(resolve as () => void))
  expect(document.querySelectorAll('[data-amr-nav]')).toHaveLength(0)
  own.textContent = 'Auto model routing'
  await new Promise(resolve => queueMicrotask(resolve as () => void))
  expect(document.querySelectorAll('[data-amr-nav]')).toHaveLength(1)
  dispose()
  expect(document.querySelector('[data-amr-nav]')).toBeNull()
  expect(document.querySelector('style[data-amr-nav-style]')).toBeNull()
  document.body.innerHTML = ''
  expect(() => installRoutingNavIcon(document)()).not.toThrow()
})
