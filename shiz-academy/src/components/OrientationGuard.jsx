import { useEffect, useState } from 'react'

export default function OrientationGuard() {
  const [portrait, setPortrait] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')
    const updateFromMQ = () => setPortrait(!!mq.matches)

    if (mq.addEventListener) mq.addEventListener('change', updateFromMQ)
    else if (mq.addListener) mq.addListener(updateFromMQ)

    const updateFromSize = () => {
      const isPortrait = window.innerHeight > window.innerWidth
      setPortrait(isPortrait)
    }

    window.addEventListener('resize', updateFromSize)
    window.addEventListener('orientationchange', updateFromSize)

    updateFromMQ()
    updateFromSize()

    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', updateFromMQ)
      else if (mq.removeListener) mq.removeListener(updateFromMQ)
      window.removeEventListener('resize', updateFromSize)
      window.removeEventListener('orientationchange', updateFromSize)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('portrait', portrait)
  }, [portrait])

  if (!portrait) return null

  return (
    <div id="rotateOverlay">
      turn phone horizontal to wake
    </div>
  )
}

