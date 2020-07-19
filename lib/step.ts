import { PromiseOK, PromiseNG } from '.'

class Step {
  id: string
  isOK: boolean = false
  isNG: boolean = false
  oks: PromiseOK[]
  ngs: PromiseNG[]
  constructor(id: string) {
    this.id = id
    this.oks = []
    this.ngs = []
  }

  append() {
    if (this.isNG) {
      const e = new Error('aborted')
      return Promise.reject(e)
    }
    if (this.isOK) {
      return Promise.resolve()
    }
    return new Promise<void>((ok, ng) => {
      this.oks.push(ok)
      this.ngs.push(ng)
    })
  }

  ok() {
    this.oks.forEach((ok) => {
      ok()
    })
  }

  ng(e: Error) {
    this.ngs.forEach((ng) => {
      ng(e)
    })
  }
}

const steps: { [id: string]: Step } = {}

export function step(id: string): Promise<void> {
  if (!steps[id]) {
    steps[id] = new Step(id)
  }
  return steps[id].append()
}

step.go = function (id: string) {
  if (steps[id]) {
    steps[id].ok()
    delete steps[id]
  } else {
    steps[id] = new Step(id)
    steps[id].isOK = true
  }
}

step.abort = function (id: string) {
  const e = new Error('aborted')
  if (steps[id]) {
    steps[id].ng(e)
    delete steps[id]
  } else {
    steps[id] = new Step(id)
    steps[id].isNG = true
  }
}

step.clear = function (id: string) {
  delete steps[id]
}

step.critical = async function (id: string, call: () => Promise<void>): Promise<void> {
  if (steps[id]) {
    await steps[id].append()
  } else {
    steps[id] = new Step(id)
  }

  await call()

  if (steps[id].oks.length) {
    steps[id].ok()
  } else {
    steps[id].isOK = true
  }
}
