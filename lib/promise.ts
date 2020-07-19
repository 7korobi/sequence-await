export type PromiseOK = () => void
export type PromiseNG = (e: Error) => void

type CONCURRENT_CALL<T, R> = {
  (args: T): R
}
type CONCURRENT_JOB<T, R> = {
  (cb: CONCURRENT_CALL<T, R>, args: T): void
}
type CONCURRENT_RUNNER<T, R> = {
  (job: CONCURRENT_JOB<T, R>): void
}

export async function concurrent<T, R>(runner: CONCURRENT_RUNNER<T, R>) {
  const list: Promise<R>[] = []
  const job: CONCURRENT_JOB<T, R> = (cb, ...args) => {
    const p = new Promise<R>((ok, ng) => {
      requestAnimationFrame(() => {
        ok(cb(...args))
      })
    })
    list.push(p)
  }
  runner(job)
  return await Promise.all(list)
}

export async function timer(ms: number): Promise<void> {
  return new Promise<void>((ok, ng) => {
    setTimeout(ok, ms)
  })
}
