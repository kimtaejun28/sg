import writeXlsxFile from 'write-excel-file/browser'
import readXlsxFile from 'read-excel-file/browser'
import { downloadBlob } from './utils'

// 시트 이름. 사람이 읽는 열을 앞에, 복원에 필요한 ID 열을 뒤에 둔다.
const SHEET = {
  students: '학생',
  behaviors: '행동유형',
  periods: '교시',
  records: '기록',
  history: '최근문구',
  settings: '설정',
}

const YES = '예'
const ACTIVE = '활성'

function headerRow(labels) {
  return labels.map((label) => ({ value: label, fontWeight: 'bold', type: String }))
}

function textRow(values) {
  return values.map((value) => ({ value: value ?? '', type: String }))
}

function nameOf(list, id) {
  return list.find((item) => item.id === id)?.name ?? ''
}

function namesOf(list, ids) {
  return (ids ?? []).map((id) => nameOf(list, id)).filter(Boolean).join(', ')
}

export async function exportBackupXlsx(payload, fileName) {
  const { students, behaviors, periods, records, detailHistory, password, exportedAt } = payload

  const studentSheet = [
    headerRow(['이름', '메모', '상태', '사용 행동유형', '주요 행동', 'ID', '사용유형ID', '주요행동ID']),
    ...students.map((s) =>
      textRow([
        s.name,
        s.memo,
        s.active === false ? '비활성' : ACTIVE,
        s.behaviorIds?.length ? namesOf(behaviors, s.behaviorIds) : '전체',
        namesOf(behaviors, s.priorityBehaviorIds),
        s.id,
        (s.behaviorIds ?? []).join(','),
        (s.priorityBehaviorIds ?? []).join(','),
      ])
    ),
  ]

  const behaviorSheet = [
    headerRow(['이름', '색상', '상세입력필수', 'ID']),
    ...behaviors.map((b) => textRow([b.name, b.color, b.requiresDetail ? YES : '아니오', b.id])),
  ]

  const periodSheet = [
    headerRow(['이름', '시작', '종료', 'ID']),
    ...periods.map((p) => textRow([p.name, p.start, p.end, p.id])),
  ]

  const recordSheet = [
    headerRow([
      '날짜',
      '시간',
      '교시',
      '학생',
      '행동유형',
      '상세내용',
      '테스트',
      '색상',
      'ID',
      '학생ID',
      '행동유형ID',
    ]),
    ...records.map((r) =>
      textRow([
        r.date,
        r.time,
        r.period,
        r.studentName,
        r.behaviorName,
        r.detail,
        r.isTest ? YES : '',
        r.color,
        r.id,
        r.studentId,
        r.behaviorId,
      ])
    ),
  ]

  const historySheet = [
    headerRow(['행동유형', '문구', '행동유형ID']),
    ...Object.entries(detailHistory ?? {}).flatMap(([behaviorId, list]) =>
      (list ?? []).map((phrase) => textRow([nameOf(behaviors, behaviorId), phrase, behaviorId]))
    ),
  ]

  const settingSheet = [
    headerRow(['항목', '값']),
    textRow(['비밀번호', password]),
    textRow(['내보낸 시각', exportedAt]),
  ]

  // 여러 시트는 { data, sheet } 객체 배열로 넘긴다(data 외의 키가 시트 옵션이 된다).
  // writeXlsxFile은 파일을 바로 만들지 않고 toBlob()/toFile()을 가진 객체를 돌려주므로,
  // CSV·JSON과 같은 다운로드 경로를 쓰도록 blob으로 받아 직접 처리한다.
  const blob = await writeXlsxFile([
    { sheet: SHEET.students, data: studentSheet },
    { sheet: SHEET.behaviors, data: behaviorSheet },
    { sheet: SHEET.periods, data: periodSheet },
    { sheet: SHEET.records, data: recordSheet },
    { sheet: SHEET.history, data: historySheet },
    { sheet: SHEET.settings, data: settingSheet },
  ]).toBlob()

  downloadBlob(blob, fileName)
}

// 헤더 이름으로 열을 찾는다. 엑셀에서 열 순서를 바꿔도 읽을 수 있도록.
function toObjects(rows) {
  if (!rows || rows.length === 0) return []
  const headers = rows[0].map((cell) => String(cell ?? '').trim())
  return rows.slice(1).map((row) => {
    const item = {}
    headers.forEach((header, i) => {
      const cell = row[i]
      item[header] = cell === null || cell === undefined ? '' : String(cell).trim()
    })
    return item
  })
}

function splitIds(value) {
  return String(value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

// normalizeBackup이 그대로 받을 수 있는 형태로 되돌린다
export async function parseBackupXlsx(file) {
  // 여러 시트가 있는 파일은 [{ sheet, data }] 형태로 한 번에 돌아온다
  const workbook = await readXlsxFile(file)
  const rowsBySheet = {}
  if (Array.isArray(workbook)) {
    workbook.forEach((entry) => {
      if (entry && !Array.isArray(entry) && Array.isArray(entry.data)) {
        rowsBySheet[entry.sheet] = toObjects(entry.data)
      }
    })
  }

  const studentRows = rowsBySheet[SHEET.students] ?? []
  const behaviorRows = rowsBySheet[SHEET.behaviors] ?? []
  const periodRows = rowsBySheet[SHEET.periods] ?? []
  const recordRows = rowsBySheet[SHEET.records] ?? []
  const historyRows = rowsBySheet[SHEET.history] ?? []
  const settingRows = rowsBySheet[SHEET.settings] ?? []

  const detailHistory = {}
  historyRows.forEach((row) => {
    const behaviorId = row['행동유형ID']
    if (!behaviorId || !row['문구']) return
    if (!detailHistory[behaviorId]) detailHistory[behaviorId] = []
    detailHistory[behaviorId].push(row['문구'])
  })

  const password = settingRows.find((row) => row['항목'] === '비밀번호')?.['값'] || null

  return {
    students: studentRows.map((row) => ({
      id: row['ID'],
      name: row['이름'],
      memo: row['메모'],
      active: row['상태'] !== '비활성',
      behaviorIds: row['사용유형ID'] ? splitIds(row['사용유형ID']) : null,
      priorityBehaviorIds: splitIds(row['주요행동ID']),
    })),
    behaviors: behaviorRows.map((row) => ({
      id: row['ID'],
      name: row['이름'],
      color: row['색상'],
      requiresDetail: row['상세입력필수'] === YES,
    })),
    periods: periodRows.map((row) => ({
      id: row['ID'],
      name: row['이름'],
      start: row['시작'],
      end: row['종료'],
    })),
    records: recordRows.map((row) => ({
      id: row['ID'],
      studentId: row['학생ID'],
      studentName: row['학생'],
      behaviorId: row['행동유형ID'],
      behaviorName: row['행동유형'],
      detail: row['상세내용'],
      color: row['색상'],
      date: row['날짜'],
      time: row['시간'],
      period: row['교시'],
      isTest: row['테스트'] === YES,
    })),
    detailHistory,
    password,
  }
}
