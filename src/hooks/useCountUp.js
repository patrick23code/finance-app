import { useEffect, useRef, useState } from 'react'

export function useCountUp(target, duration = 900) {
  const [current, setCurrent] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const start = 0
    const startTime = performance.now()

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(start + (target - start) * eased)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return current
}
