import type { FlagSet, QuestionDefinition } from '~/types/models'

function normalizeLikert(value: unknown) {
  const score = Number(value)
  if (Number.isNaN(score) || score < 1 || score > 5) {
    return 0
  }
  return (score - 1) / 4
}

export function normalizeAnswers(
  questions: QuestionDefinition[],
  answers: Record<string, unknown>
) {
  return Object.fromEntries(
    questions.map((question) => {
      const answer = answers[question.id]

      if (question.inputType === 'boolean') {
        return [question.id, answer === true ? 1 : 0]
      }

      if (question.inputType === 'likert5') {
        return [question.id, normalizeLikert(answer)]
      }

      const option = question.options?.find((candidate) => candidate.value === answer)
      return [question.id, option?.normalized ?? 0]
    })
  )
}

export function calculateSectionAverages(
  questions: QuestionDefinition[],
  normalized: Record<string, unknown>
) {
  const buckets: Record<string, number[]> = {}

  for (const question of questions) {
    const score = Number(normalized[question.id] ?? 0)
    const sectionScores = buckets[question.section] ?? []
    sectionScores.push(score)
    buckets[question.section] = sectionScores
  }

  return Object.fromEntries(
    Object.entries(buckets).map(([section, scores]) => {
      const total = scores.reduce((sum, value) => sum + value, 0)
      return [section, scores.length ? total / scores.length : 0]
    })
  )
}

export function computeOverallScore(sectionAverages: Record<string, number>) {
  const values = Object.values(sectionAverages)
  if (!values.length) {
    return 0
  }
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

export function detectFlags(answers: Record<string, unknown>): FlagSet {
  return {
    emotionUnlabeled: answers.A1 === false,
    trustToneRisk: answers.B4 === false,
    hoarding: answers.C3 === false,
    rushedConclusion: answers.D3 === 'fixed',
    unstableAxis: answers.E2 !== 4 && answers.E2 !== 5
  }
}

export function generateSuggestions(input: {
  flags: FlagSet
  sectionAverages: Record<string, number>
  answers: Record<string, unknown>
}) {
  const suggestions: string[] = []

  if (input.flags.emotionUnlabeled) {
    suggestions.push('感情に名前を置くだけで、距離ができる。')
  }

  if (input.flags.trustToneRisk) {
    suggestions.push('言葉の品位は、静かな信頼をつくる。')
  }

  if (input.flags.hoarding) {
    suggestions.push('余白を少し先に置くと、動きが整う。')
  }

  if (input.flags.rushedConclusion) {
    suggestions.push('結論を急がないと、視野が広がる。')
  }

  if (input.flags.unstableAxis) {
    suggestions.push('重心を分けると、判断は軽くなる。')
  }

  if (!suggestions.length) {
    suggestions.push('今日は整っている。そのままで大丈夫。')
  }

  return suggestions.slice(0, 3)
}
