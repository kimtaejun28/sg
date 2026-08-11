import { OUT_OF_SCHEDULE } from './constants.js'

export function pad2(n) {
  return String(n).padStart(2, '0')
}

export function todayStr(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

export function nowTimeStr(date = new Date()) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

function hmToSeconds(hm) {
  const [h, m] = hm.split(':').map(Number)
  return h * 3600 + m * 60
}

function hmsToSeconds(hms) {
  const parts = hms.split(':').map(Number)
  const h = parts[0] || 0
  const m = parts[1] || 0
  const s = parts[2] || 0
  return h * 3600 + m * 60 + s
}

// start <= time < end (시작 포함, 종료 미포함)
export function getPeriodName(timeStr, periods) {
  const t = hmsToSeconds(timeStr)
  const match = periods.find((p) => {
    const start = hmToSeconds(p.start)
    const end = hmToSeconds(p.end)
    return t >= start && t < end
  })
  return match ? match.name : OUT_OF_SCHEDULE
}

export function sortedPeriods(periods) {
  return [...periods].sort((a, b) => hmToSeconds(a.start) - hmToSeconds(b.start))
}

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(dateStr, days) {
  const d = parseDateLocal(dateStr)
  d.setDate(d.getDate() + days)
  return todayStr(d)
}

export function addMonths(monthStr, months) {
  const [y, m] = monthStr.split('-').map(Number)
  const d = new Date(y, m - 1 + months, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

// 월요일 시작 주간 범위
export function getWeekRange(dateStr) {
  const d = parseDateLocal(dateStr)
  const dow = d.getDay() // 0=Sun..6=Sat
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: todayStr(monday), end: todayStr(sunday) }
}

// ISO 8601 주차 번호
export function getISOWeekNumber(dateStr) {
  const d = parseDateLocal(dateStr)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dayNr = (target.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const firstDayNr = (firstThursday.getDay() + 6) % 7
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3)
  const weekNumber = 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000))
  return weekNumber
}

export function getMonthRange(monthStr) {
  const [y, m] = monthStr.split('-').map(Number)
  const start = `${y}-${pad2(m)}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const end = `${y}-${pad2(m)}-${pad2(lastDay)}`
  return { start, end }
}

export function daysInRange(startStr, endStr) {
  const dates = []
  let cur = startStr
  let guard = 0
  while (cur <= endStr && guard < 400) {
    dates.push(cur)
    cur = addDays(cur, 1)
    guard += 1
  }
  return dates
}

export function inDateRange(dateStr, startStr, endStr) {
  return dateStr >= startStr && dateStr <= endStr
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
export function weekdayLabel(dateStr) {
  const d = parseDateLocal(dateStr)
  return WEEKDAY_LABELS[d.getDay()]
}

export function isWeekend(dateStr) {
  const day = parseDateLocal(dateStr).getDay()
  return day === 0 || day === 6
}

export function csvEscape(value) {
  const str = String(value ?? '')
  return `"${str.replace(/"/g, '""')}"`
}

export function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadCsv(rows, filename) {
  const body = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
  // 엑셀이 UTF-8로 인식하도록 BOM을 앞에 붙인다
  downloadFile('﻿' + body, filename, 'text/csv;charset=utf-8;')
}

export function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
