import { describe, expect, it } from 'vitest'
import { QUESTION_DEFINITIONS } from '../app/utils/questions'
import { detectFlags, normalizeAnswers } from '../app/utils/scoring'

describe('normalizeAnswers', () => {
  it('normalizes boolean, likert, and select values', () => {
    const answers = {
      A1: true,
      A2: 5,
      C2: 'short'
    }

    const questions = QUESTION_DEFINITIONS.filter((question) =>
      ['A1', 'A2', 'C2'].includes(question.id)
    )
    const normalized = normalizeAnswers(questions, answers)

    expect(normalized.A1).toBe(1)
    expect(normalized.A2).toBe(1)
    expect(normalized.C2).toBe(0.5)
  })
})

describe('detectFlags', () => {
  it('detects all relevant flags', () => {
    const flags = detectFlags({
      A1: false,
      B4: false,
      C3: false,
      D3: 'fixed',
      E2: 3
    })

    expect(flags).toEqual({
      emotionUnlabeled: true,
      trustToneRisk: true,
      hoarding: true,
      rushedConclusion: true,
      unstableAxis: true
    })
  })
})
