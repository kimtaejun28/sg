export const STORAGE_KEYS = {
  students: 'bt_students',
  behaviors: 'bt_behaviors',
  periods: 'bt_periods',
  records: 'bt_records',
  password: 'bt_password',
  detailHistory: 'bt_detail_history',
}

export const DEFAULT_PASSWORD = '0303'

export const DEFAULT_PERIODS = [
  { id: 'p_1', name: '조회', start: '08:30', end: '09:00' },
  { id: 'p_2', name: '1교시', start: '09:00', end: '09:40' },
  { id: 'p_3', name: '쉬는시간(1)', start: '09:40', end: '09:45' },
  { id: 'p_4', name: '2교시', start: '09:45', end: '10:25' },
  { id: 'p_5', name: '쉬는시간(2)', start: '10:25', end: '10:30' },
  { id: 'p_6', name: '3교시', start: '10:30', end: '11:10' },
  { id: 'p_7', name: '쉬는시간(3)', start: '11:10', end: '11:15' },
  { id: 'p_8', name: '4교시', start: '11:15', end: '11:55' },
  { id: 'p_9', name: '쉬는시간(4)', start: '11:55', end: '12:00' },
  { id: 'p_10', name: '5교시', start: '12:00', end: '12:40' },
  { id: 'p_11', name: '점심시간', start: '12:40', end: '13:40' },
  { id: 'p_12', name: '6교시', start: '13:40', end: '14:20' },
  { id: 'p_13', name: '종례', start: '14:20', end: '14:30' },
  { id: 'p_14', name: '방과후', start: '14:30', end: '16:00' },
]

export const OUT_OF_SCHEDULE = '일과 외'

export const DEFAULT_BEHAVIORS = [
  { id: 'b_1', name: '수업 이탈', color: '#3B82C4', requiresDetail: false },
  { id: 'b_2', name: '고성/소음', color: '#E8A33D', requiresDetail: false },
  { id: 'b_3', name: '공격/파괴', color: '#E0506B', requiresDetail: false },
  { id: 'b_4', name: '수업 방해', color: '#7C6FE0', requiresDetail: false },
  { id: 'b_5', name: '자해', color: '#C43B7A', requiresDetail: false },
  { id: 'b_6', name: '기타', color: '#5FA893', requiresDetail: true },
]

export const CARD_GRADIENTS = [
  'from-sky-200 to-cyan-300',
  'from-violet-200 to-fuchsia-300',
  'from-amber-200 to-orange-300',
  'from-emerald-200 to-teal-300',
  'from-rose-200 to-pink-300',
  'from-indigo-200 to-blue-300',
]

export const BEHAVIOR_COLOR_PRESETS = [
  '#3B82C4',
  '#E8A33D',
  '#E0506B',
  '#7C6FE0',
  '#C43B7A',
  '#5FA893',
  '#F59E0B',
  '#64748B',
]

export const SAMPLE_DETAILS = [
  '책상을 세게 두드림',
  '물건을 밖으로 던짐',
  '큰 소리로 소리를 지름',
  '옆 친구를 밀침',
  '수업 중 자리를 이탈함',
  '지시에 불응하며 소리를 냄',
]

export const DETAIL_HISTORY_MAX = 12
