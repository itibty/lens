import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { UIConfig } from '@/core/config'
import { CHROME_THEMES, chromeCssVars, readChromeTheme, resolveChromeTheme, saveChromeTheme } from './chrome'
import { themeCssVars } from './cssVars'
import { DARK_THEME, LIGHT_THEME, mixColor, NAVBAR_COLORS } from './tokens'

const appearanceEnabled = UIConfig.appearanceEnabled
let stored: Map<string, string>

beforeEach(() => {
  UIConfig.appearanceEnabled = true
  stored = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
  })
})

afterEach(() => {
  UIConfig.appearanceEnabled = appearanceEnabled
  vi.unstubAllGlobals()
})

describe('system appearance', () => {
  it('uses classic for missing, invalid or inherited preset names', () => {
    for (const value of [null, undefined, '', 'obsolete', '__proto__', 'constructor', {}])
      expect(resolveChromeTheme(value)).toBe('classic')
    stored.set('NA:chrome_theme', 'obsolete')
    expect(readChromeTheme()).toBe('classic')
  })

  it('restores the browser preference and clears only that preference when reverting', () => {
    stored.set('NA:access_token', 'untouched')
    saveChromeTheme('navy')
    expect(readChromeTheme()).toBe('navy')
    saveChromeTheme('light')
    expect(readChromeTheme()).toBe('light')
    saveChromeTheme('classic')
    expect(readChromeTheme()).toBe('classic')
    expect(stored.has('NA:chrome_theme')).toBe(false)
    expect(stored.get('NA:access_token')).toBe('untouched')
  })

  it('ignores saved appearances when the feature is disabled', () => {
    saveChromeTheme('forest')
    UIConfig.appearanceEnabled = false
    expect(readChromeTheme()).toBe('classic')
    expect(resolveChromeTheme('navy')).toBe('classic')
  })

  it('keeps startup and switching usable when browser storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('Storage disabled') },
      setItem: () => { throw new Error('Storage disabled') },
      removeItem: () => { throw new Error('Storage disabled') },
    })
    expect(readChromeTheme()).toBe('classic')
    expect(() => saveChromeTheme('navy')).not.toThrow()
    expect(() => saveChromeTheme('classic')).not.toThrow()
  })

  it('preserves the existing default navigation colors', () => {
    expect(CHROME_THEMES.classic.navbar).toMatchObject(NAVBAR_COLORS)
    expect(CHROME_THEMES.classic.navbar.brand).toBe(DARK_THEME.primary.base)
    expect(CHROME_THEMES.classic.sidebar).toMatchObject({
      background: LIGHT_THEME.surface.panel,
      text: LIGHT_THEME.text.strong,
      activeText: LIGHT_THEME.primary.base,
      active: mixColor(LIGHT_THEME.primary.base, LIGHT_THEME.surface.panel, 0.1),
    })
  })

  it('limits every preset to navigation variables and preserves content theme values', () => {
    const before = themeCssVars(LIGHT_THEME)
    for (const id of Object.keys(CHROME_THEMES) as Array<keyof typeof CHROME_THEMES>) {
      const vars = chromeCssVars(id)
      expect(Object.keys(vars).every(key => /^--na-(?:navbar|sidebar)-/.test(key))).toBe(true)
      expect({ ...before, ...vars }['--el-color-primary']).toBe(before['--el-color-primary'])
      expect({ ...before, ...vars }['--na-content-bg']).toBe(before['--na-content-bg'])
    }
    expect(themeCssVars(LIGHT_THEME)).toEqual(before)
  })
})
