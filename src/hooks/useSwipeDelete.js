import { useState, useRef } from 'react'

export function useSwipeDelete() {
  const [swiped, setSwiped] = useState(null)
  const touchStart = useRef(0)
  const touchEnd = useRef(0)
  const moved = useRef(false)

  const handleTouchStart = (id, e) => {
    const x = e.targetTouches[0].clientX
    touchStart.current = x
    touchEnd.current = x
    moved.current = false
  }

  const handleTouchMove = (id, e) => {
    touchEnd.current = e.targetTouches[0].clientX
    if (Math.abs(touchEnd.current - touchStart.current) > 5) {
      moved.current = true
    }
  }

  const handleTouchEnd = (id) => {
    if (!moved.current) return // pure tap, do nothing
    const distance = touchStart.current - touchEnd.current
    if (distance > 50) {
      setSwiped(id)
    } else if (distance < -50) {
      setSwiped(null)
    }
  }

  // returns true if last touch was a swipe (used to suppress click)
  const wasSwipe = () => moved.current

  return {
    swiped,
    setSwiped,
    wasSwipe,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
