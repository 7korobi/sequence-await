import { PromiseOK, PromiseNG } from '.'

let Qstart: PromiseOK | null = null
let Qnow: QEntry | null = null
let queue: QEntry[] = []
const qtail: { [id: string]: QEntry } = {}

interface QRunnable {
  id: string | null
  run(): Promise<void>
  abort(): void
}

class QEntry implements QRunnable {
  id: string
  waits: [PromiseOK, PromiseNG][]
  call: () => Promise<void>
  ok: PromiseOK
  ng: PromiseNG
  now: number
  abortController!: AbortController

  constructor(
    id: string,
    call: () => Promise<void>,
    ok: PromiseOK,
    ng: PromiseNG,
    waits: [PromiseOK, PromiseNG][]
  ) {
    this.id = id
    this.waits = waits
    this.call = call
    this.ok = ok
    this.ng = ng
    this.now = performance.now()
  }

  run(): Promise<void> {
    return new Promise((ok, ng) => {
      this.abortController = new AbortController()
      this.abortController.signal.addEventListener('abort', ng)
      this.call()
        .then(() => {
          this.ok()
          this.waits.forEach(([ok, ng]) => {
            ok()
          })
          delete qtail[this.id]
          ok()
        })
        .catch((e) => {
          this.abort()
          this.ng(e)
          delete qtail[this.id]
          ng(e)
        })
    })
  }

  async abort() {
    const e = new Error(`abort`)
    this.waits.forEach(([ok, ng]) => {
      ng(e)
    })
  }
}

timeQ.wait = async function timeQWait(id: string): Promise<void> {
  return new Promise<void>((ok, ng) => {
    const q = timeQ.findTail(id)
    if (q) {
      q.waits.push([ok, ng])
    } else {
      ok()
    }
  })
}

timeQ.fast = function (id: string, call: () => Promise<void>): Promise<void> {
  return timeQ(id, call, true)
}

export async function timeQ(id: string, call: () => Promise<void>, isFast = false): Promise<void> {
  return new Promise<void>((ok, ng) => {
    const q = timeQ.findTail(id)
    let waits: [PromiseOK, PromiseNG][] = []
    if (q) {
      const now = performance.now()
      console.warn(`skip ${id}`, q.now, now)
      q.waits.push([ok, ng])
      return
    }

    qtail[id] = new QEntry(id, call, ok, ng, waits)
    if (isFast) {
      qtail[id].run()
    } else {
      queue.push(qtail[id])
      if (Qstart) {
        Qstart()
        Qstart = null
      }
    }
  })
}

timeQ.findTail = function timeQFindTail(id: string): QEntry | null {
  if (qtail[id]) {
    return qtail[id]
  }
  if (Qnow && Qnow.id === id) {
    return Qnow
  }
  return null
}

timeQ.findAll = function timeQFindAll(id: string): [QEntry[], QEntry[]] {
  const finds: QEntry[] = []
  const normal: QEntry[] = []
  queue.forEach((q) => {
    if (q.id === id) {
      finds.push(q)
    } else {
      normal.push(q)
    }
  })
  return [finds, normal]
}

timeQ.find = function timeQFind(id: string): number {
  const [finds] = timeQ.findAll(id)
  if (Qnow && Qnow.id === id) {
    finds.push(Qnow)
  }
  return finds.length
}

timeQ.express = function timeQExpress(id: string): number {
  const [express, normal] = timeQ.findAll(id)
  queue = [...express, ...normal]
  return express.length
}

timeQ.abort = function timeQAbort(id: string): number {
  const [abort, normal] = timeQ.findAll(id)
  queue = normal
  abort.forEach((q) => {
    delete qtail[q.id]
  })
  if (Qnow && Qnow.id === id) {
    Qnow.abortController.abort()
    abort.push(Qnow)
  }
  return abort.length
}

async function timeQRun() {
  if (Qnow) {
    return
  }
  if (!queue.length) {
    Qstart = timeQRun
    return
  }
  Qnow = queue.shift()!
  try {
    await Qnow!.run()
  } catch (e) {
    Qnow!.abort()
  }
  Qnow = null
  requestAnimationFrame(timeQRun)
}
timeQRun()
