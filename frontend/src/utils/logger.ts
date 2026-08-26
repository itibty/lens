type LogMethod = 'debug' | 'info' | 'warn' | 'error'

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const enableDebugLog = import.meta.env.DEV || import.meta.env.VITE_ENABLE_LOG === '1'

function writeLog(scope: string, method: LogMethod, args: unknown[]) {
  if (!enableDebugLog && (method === 'debug' || method === 'info'))
    return

  console[method](`[${scope}]`, ...args)
}

export function createLogger(scope: string): Logger {
  return {
    debug: (...args: unknown[]) => writeLog(scope, 'debug', args),
    info: (...args: unknown[]) => writeLog(scope, 'info', args),
    warn: (...args: unknown[]) => writeLog(scope, 'warn', args),
    error: (...args: unknown[]) => writeLog(scope, 'error', args),
  }
}

export const logger = createLogger('APP')
