import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

class BrowserRequest {
  readonly input: RequestInfo | URL
  readonly init?: RequestInit
  constructor(input: RequestInfo | URL, init?: RequestInit) { this.input = input; this.init = init }
}

Object.assign(globalThis, { Request: BrowserRequest })

afterEach(() => { cleanup(); sessionStorage.clear() })
