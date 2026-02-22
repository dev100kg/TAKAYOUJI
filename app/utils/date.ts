export function getLocalDateString(value: Date = new Date()) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function pad2(value: number) {
  return `${value}`.padStart(2, '0')
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function fromDateKey(key: string) {
  const [yearText, monthText, dayText] = key.split('-')
  const year = Number.parseInt(yearText || '0', 10)
  const month = Number.parseInt(monthText || '1', 10)
  const day = Number.parseInt(dayText || '1', 10)
  return new Date(year, month - 1, day)
}

function getNthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(year, month - 1, 1)
  const shift = (7 + weekday - first.getDay()) % 7
  return 1 + shift + (nth - 1) * 7
}

function getSpringEquinoxDay(year: number) {
  if (year <= 1979) {
    return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4))
  }
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

function getAutumnEquinoxDay(year: number) {
  if (year <= 1979) {
    return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4))
  }
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

function buildBaseJapaneseHolidays(year: number) {
  const holidays = new Set<string>()

  const add = (month: number, day: number) => {
    holidays.add(toDateKey(year, month, day))
  }

  add(1, 1)
  add(1, getNthWeekdayOfMonth(year, 1, 1, 2))
  add(2, 11)

  if (year >= 2020) {
    add(2, 23)
  }

  add(3, getSpringEquinoxDay(year))

  add(4, 29)
  add(5, 3)
  add(5, 4)
  add(5, 5)

  if (year === 2020) {
    add(7, 23)
  } else if (year === 2021) {
    add(7, 22)
  } else {
    add(7, getNthWeekdayOfMonth(year, 7, 1, 3))
  }

  if (year === 2020) {
    add(8, 10)
  } else if (year === 2021) {
    add(8, 8)
  } else if (year >= 2016) {
    add(8, 11)
  }

  add(9, getNthWeekdayOfMonth(year, 9, 1, 3))
  add(9, getAutumnEquinoxDay(year))

  if (year === 2020) {
    add(7, 24)
  } else if (year === 2021) {
    add(7, 23)
  } else {
    add(10, getNthWeekdayOfMonth(year, 10, 1, 2))
  }

  add(11, 3)
  add(11, 23)

  return holidays
}

function addSubstituteHolidays(holidays: Set<string>) {
  const sorted = [...holidays].sort()
  for (const key of sorted) {
    const date = fromDateKey(key)
    if (date.getDay() !== 0) {
      continue
    }

    const substitute = new Date(date)
    do {
      substitute.setDate(substitute.getDate() + 1)
    } while (holidays.has(getLocalDateString(substitute)))

    holidays.add(getLocalDateString(substitute))
  }
}

function addCitizensHolidays(year: number, holidays: Set<string>) {
  for (let month = 1; month <= 12; month += 1) {
    const maxDay = new Date(year, month, 0).getDate()
    for (let day = 2; day < maxDay; day += 1) {
      const key = toDateKey(year, month, day)
      if (holidays.has(key)) {
        continue
      }

      const date = new Date(year, month - 1, day)
      if (date.getDay() === 0) {
        continue
      }

      const prev = toDateKey(year, month, day - 1)
      const next = toDateKey(year, month, day + 1)
      if (holidays.has(prev) && holidays.has(next)) {
        holidays.add(key)
      }
    }
  }
}

const japaneseHolidayCache = new Map<number, Set<string>>()

function getJapaneseHolidaySet(year: number) {
  const cached = japaneseHolidayCache.get(year)
  if (cached) {
    return cached
  }

  const holidays = buildBaseJapaneseHolidays(year)
  addSubstituteHolidays(holidays)
  addCitizensHolidays(year, holidays)
  japaneseHolidayCache.set(year, holidays)
  return holidays
}

export function isJapaneseHoliday(date: Date) {
  const year = date.getFullYear()
  const key = getLocalDateString(date)
  return getJapaneseHolidaySet(year).has(key)
}

export function isWeekendOrHoliday(date: Date) {
  const day = date.getDay()
  if (day === 0 || day === 6) {
    return true
  }

  return isJapaneseHoliday(date)
}

export function parseLocalDateString(value: string) {
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number.parseInt(yearText || '0', 10)
  const month = Number.parseInt(monthText || '1', 10)
  const day = Number.parseInt(dayText || '1', 10)
  return new Date(year, month - 1, day)
}

function parseTimeToMinutes(value: string) {
  const [hourText, minuteText] = value.split(':')
  const hour = Number.parseInt(hourText || '0', 10)
  const minute = Number.parseInt(minuteText || '0', 10)

  return hour * 60 + minute
}

export function isNightTime(current = new Date(), nightStart = '20:00', nightEnd = '06:00') {
  const currentMinutes = current.getHours() * 60 + current.getMinutes()
  const startMinutes = parseTimeToMinutes(nightStart)
  const endMinutes = parseTimeToMinutes(nightEnd)

  if (startMinutes === endMinutes) {
    return false
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

export function daysAgoDateString(days: number) {
  const now = new Date()
  now.setDate(now.getDate() - days)
  return getLocalDateString(now)
}
