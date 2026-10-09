import type { Fraction } from '../types/game'

const assertPositiveDenominator = (fraction: Fraction): void => {
  if (fraction.denominator <= 0) {
    throw new Error('Denominator must be positive.')
  }
}

export const gcd = (left: number, right: number): number => {
  let a = Math.abs(left)
  let b = Math.abs(right)

  while (b !== 0) {
    const next = a % b
    a = b
    b = next
  }

  return a || 1
}

export const simplifyFraction = (fraction: Fraction): Fraction => {
  assertPositiveDenominator(fraction)

  const divisor = gcd(fraction.numerator, fraction.denominator)
  return {
    numerator: fraction.numerator / divisor,
    denominator: fraction.denominator / divisor,
  }
}

export const addFractions = (fractions: Fraction[]): Fraction => {
  const total = fractions.reduce<Fraction>(
    (current, next) => {
      assertPositiveDenominator(next)

      return simplifyFraction({
        numerator:
          current.numerator * next.denominator +
          next.numerator * current.denominator,
        denominator: current.denominator * next.denominator,
      })
    },
    { numerator: 0, denominator: 1 },
  )

  return simplifyFraction(total)
}

export const compareFractions = (left: Fraction, right: Fraction): number => {
  assertPositiveDenominator(left)
  assertPositiveDenominator(right)

  return left.numerator * right.denominator - right.numerator * left.denominator
}

export const areFractionsEqual = (left: Fraction, right: Fraction): boolean =>
  compareFractions(left, right) === 0

export const formatFraction = (fraction: Fraction): string => {
  const simplified = simplifyFraction(fraction)

  if (simplified.numerator === 0) {
    return '0'
  }

  if (simplified.denominator === 1) {
    return `${simplified.numerator}`
  }

  return `${simplified.numerator}/${simplified.denominator}`
}

export const toPercent = (fraction: Fraction): number =>
  (fraction.numerator / fraction.denominator) * 100
