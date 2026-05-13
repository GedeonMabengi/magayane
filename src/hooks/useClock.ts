import { useState, useEffect } from 'react'

export function useClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const formatted = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now)
      setTime(`CEST ${formatted}`)
    }

    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  return time
}
