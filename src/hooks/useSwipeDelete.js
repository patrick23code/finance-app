import { useState, useRef } from 'react'

export function useSwipeDelete() {
  const [swiped, setSwiped] = useState(null)
  const touchStart = useRef(0)
  const touchEnd = useRef(0)

  const handleTouchStart = (id, e) => {
    touchStart.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (id, e) => {
    touchEnd.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = (id) => {
    const distance = touchStart.current - touchEnd.current
    if (distance > 50) {
      setSwiped(id)
    } else if (distance < -50) {
      setSwiped(null)
    }
  }

  return {
    swiped,
    setSwiped,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
