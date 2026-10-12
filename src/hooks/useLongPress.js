import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_DELAY = 500

/**
 * 한 버튼에 짧게 누르기와 길게 누르기를 함께 붙인다.
 *
 * 포인터 이벤트를 쓰는 이유: 터치와 마우스를 한 벌의 핸들러로 처리할 수 있고,
 * 터치에서 click이 지연되는 문제도 피할 수 있다.
 */
export function useLongPress({ onShortPress, onLongPress, delay = DEFAULT_DELAY }) {
  const timerRef = useRef(null)
  const firedRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 버튼이 사라진 뒤 타이머가 남아 실행되는 일이 없도록 정리한다
  useEffect(() => clearTimer, [clearTimer])

  const handlePointerDown = useCallback(
    (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      firedRef.current = false
      clearTimer()
      timerRef.current = setTimeout(() => {
        firedRef.current = true
        timerRef.current = null
        // 길게 누른 것이 인식됐음을 손끝으로 알려준다(지원하는 기기에서만)
        navigator.vibrate?.(25)
        onLongPress()
      }, delay)
    },
    [clearTimer, delay, onLongPress]
  )

  const handlePointerUp = useCallback(() => {
    const wasLongPress = firedRef.current
    clearTimer()
    firedRef.current = false
    if (!wasLongPress) onShortPress()
  }, [clearTimer, onShortPress])

  // 손가락이 버튼 밖으로 벗어나면 아무것도 실행하지 않는다
  const handleCancel = useCallback(() => {
    clearTimer()
    firedRef.current = false
  }, [clearTimer])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      // 키보드로는 길게 누를 수 없으므로 Shift를 상세 입력 단축키로 둔다
      if (e.shiftKey) onLongPress()
      else onShortPress()
    },
    [onLongPress, onShortPress]
  )

  return {
    onPointerDown: handlePointerDown,
    onPointerUp: handlePointerUp,
    onPointerLeave: handleCancel,
    onPointerCancel: handleCancel,
    onKeyDown: handleKeyDown,
    // 길게 누를 때 뜨는 컨텍스트 메뉴·텍스트 선택을 막는다
    onContextMenu: (e) => e.preventDefault(),
  }
}
