import { describe, expect, it } from 'vitest'
import { cardFitScale, scaleFitPx } from './cardFit'
import { scaleNumberSizeVars } from './numberFit'
import { progressSizeVars } from './progressCard'

describe('card fit levels', () => {
  it('gives nearby card sizes the same typography', () => {
    expect(cardFitScale(280, 168)).toBe(1.25)
    expect(cardFitScale(288, 175)).toBe(1.25)
    expect(cardFitScale(216, 128)).toBe(1)
    expect(cardFitScale(180, 110)).toBe(0.8)
    expect(cardFitScale(268, 110)).toBe(0.8)
  })

  it('uses the limiting dimension and keeps the existing size bounds', () => {
    expect(cardFitScale(1200, 128)).toBe(1)
    expect(cardFitScale(216, 800)).toBe(1)
    expect(cardFitScale(50, 40)).toBe(0.7)
    expect(cardFitScale(2000, 1200)).toBe(2.8)
    expect(cardFitScale(0, 0)).toBe(1)
  })

  it('waits for room before growing and shrinks as soon as a level no longer fits', () => {
    expect(cardFitScale(270, 160, 1)).toBe(1)
    expect(cardFitScale(273, 164, 1)).toBe(1)
    expect(cardFitScale(274, 164, 1)).toBe(1.25)
    expect(cardFitScale(270, 160, 1.25)).toBe(1.25)
    expect(cardFitScale(269, 160, 1.25)).toBe(1)
    // A large resize still reaches an intermediate level if the highest needs more room.
    expect(cardFitScale(432, 256, 1)).toBe(1.5)
  })

  it('produces whole-pixel sizes for metric and progress typography', () => {
    expect(scaleFitPx(15, 0.8)).toBe(12)
    const sizes = { ...scaleNumberSizeVars(0.8), ...progressSizeVars(1.25) }
    for (const value of Object.values(sizes))
      expect(value).toMatch(/^\d+px$/)
  })
})
