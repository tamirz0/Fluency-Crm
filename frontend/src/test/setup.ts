import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

const NativeRequest = globalThis.Request
class BrowserRequest extends NativeRequest {
  readonly input: RequestInfo | URL
  readonly init?: RequestInit
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === 'string' ? new URL(input, window.location.origin) : input, init)
    this.input = input
    this.init = init
  }
}

Object.assign(globalThis, { Request: BrowserRequest })

afterEach(() => { cleanup(); sessionStorage.clear() })
