// 결과를 이미지 한 장으로 만들어 저장한다. 화면 캡처 대신 직접 그린다.
const BG = '#0b1220'
const CARD = '#131f36'
const AMBER = '#fbbf24'
const TEXT = '#e2e8f0'
const MUTED = '#94a3b8'

const display = (size, weight = 700) => `${weight} ${size}px Jua, "Noto Sans KR", sans-serif`
const body = (size, weight = 700) => `${weight} ${size}px "Noto Sans KR", system-ui, sans-serif`

export async function buildResultImage({ heading, subtitle, groups }) {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* 폰트를 못 불러와도 기본 글꼴로 그린다 */
    }
  }

  const W = 760
  const pad = 44
  const rowH = 52
  const groupGap = 26
  const headerH = subtitle ? 148 : 120

  let bodyH = 0
  for (const g of groups) {
    if (g.title) bodyH += 40
    bodyH += g.items.length * rowH + groupGap
  }
  const H = Math.max(headerH + bodyH + pad, 320)

  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = H * dpr
  const ctx = canvas.getContext('2d')
  ctx.scale(dpr, dpr)

  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, BG)
  grad.addColorStop(1, CARD)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = AMBER
  ctx.font = display(40)
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(heading, pad, 76)

  if (subtitle) {
    ctx.fillStyle = MUTED
    ctx.font = body(18, 500)
    ctx.fillText(subtitle, pad, 110)
  }

  ctx.strokeStyle = 'rgba(148,163,184,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(pad, headerH - 26)
  ctx.lineTo(W - pad, headerH - 26)
  ctx.stroke()

  let y = headerH
  for (const group of groups) {
    if (group.title) {
      ctx.fillStyle = AMBER
      ctx.font = display(24)
      ctx.fillText(group.title, pad, y + 22)
      y += 40
    }
    for (const item of group.items) {
      ctx.fillStyle = 'rgba(148,163,184,0.10)'
      ctx.beginPath()
      ctx.roundRect(pad, y, W - pad * 2, rowH - 10, 12)
      ctx.fill()

      let x = pad + 18
      if (item.label) {
        ctx.fillStyle = AMBER
        ctx.font = body(20, 700)
        ctx.fillText(item.label, x, y + 29)
        x += 62
      }
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.arc(x + 8, y + 21, 8, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = TEXT
      ctx.font = body(21, 700)
      ctx.fillText(item.name, x + 26, y + 29)
      y += rowH
    }
    y += groupGap
  }

  ctx.fillStyle = MUTED
  ctx.font = body(14, 500)
  ctx.fillText('구슬 레이스 룰렛', pad, H - 20)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
