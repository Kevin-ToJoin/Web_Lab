/**
 * BugReporter.test.tsx
 *
 * Tests the Bug Reporter scoring + fuzzy keyword matching INDIRECTLY through
 * the provider (matchKnownBug is module-private). Real keyword combinations are
 * pulled programmatically from knownBugs so the tests stay correct if wording
 * changes.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { BugReporterProvider, useBugReporter } from '../context/BugReporterContext'
import { knownBugs } from '../data/knownBugs'

// Pick a real bug whose first two keywords are distinct (so a title containing
// both reliably yields >= 2 keyword hits).
const findUsableBug = (appId: string) =>
  knownBugs.find(b => {
    if (b.appId !== appId) return false
    const [k0, k1] = b.keywords
    return k0 && k1 && k0 !== k1
  })

const titleFromBug = (bug: { keywords: string[] }) =>
  `The ${bug.keywords[0]} and ${bug.keywords[1]} are broken`

const baseReport = (appId: string, title: string) => ({
  appId,
  title,
  severity: 'High' as const,
  stepsToReproduce: 'do the thing',
  expectedResult: 'works',
  actualResult: 'broken',
})

const setup = () =>
  renderHook(() => useBugReporter(), { wrapper: BugReporterProvider })

describe('BugReporter — scoring + matching', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('a title containing 2+ keywords of a real bug matches that bug and marks it found', () => {
    const bug = findUsableBug('catalog')!
    expect(bug).toBeDefined()

    const { result } = setup()
    let returned: ReturnType<typeof result.current.submitReport>
    act(() => {
      returned = result.current.submitReport(baseReport('catalog', titleFromBug(bug)))
    })

    expect(returned!.matchedKnownBugId).toBe(bug.id)
    expect(result.current.getScoreForApp('catalog').found).toBe(1)
  })

  it('a vague title with < 2 matching keywords does not match and found stays 0', () => {
    const { result } = setup()
    let returned: ReturnType<typeof result.current.submitReport>
    act(() => {
      returned = result.current.submitReport(
        baseReport('catalog', 'something is a little weird here zzz')
      )
    })

    expect(returned!.matchedKnownBugId).toBeUndefined()
    expect(result.current.getScoreForApp('catalog').found).toBe(0)
  })

  it('getScoreForApp total equals the number of known bugs for that app', () => {
    const { result } = setup()
    for (const appId of ['catalog', 'registration', 'ecommerce', 'bank', 'healthcare', 'trading']) {
      const expected = knownBugs.filter(b => b.appId === appId).length
      expect(result.current.getScoreForApp(appId).total).toBe(expected)
    }
  })

  it('two reports matching the SAME known bug count as 1 found (dedup)', () => {
    const bug = findUsableBug('bank')!
    expect(bug).toBeDefined()

    const { result } = setup()
    act(() => {
      result.current.submitReport(baseReport('bank', titleFromBug(bug)))
    })
    act(() => {
      result.current.submitReport(baseReport('bank', `Again: ${titleFromBug(bug)}`))
    })

    expect(result.current.reports.filter(r => r.appId === 'bank')).toHaveLength(2)
    expect(result.current.getScoreForApp('bank').found).toBe(1)
  })

  it('submitReport returns a report object with an id and createdAt', () => {
    const { result } = setup()
    let returned: ReturnType<typeof result.current.submitReport>
    act(() => {
      returned = result.current.submitReport(baseReport('trading', 'a generic report title'))
    })

    expect(typeof returned!.id).toBe('string')
    expect(returned!.id.length).toBeGreaterThan(0)
    expect(typeof returned!.createdAt).toBe('string')
    expect(Number.isNaN(Date.parse(returned!.createdAt))).toBe(false)
  })
})
