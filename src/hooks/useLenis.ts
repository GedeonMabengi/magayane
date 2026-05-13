import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null

export function getLenis() {
  return lenisInstance
}

export function useLenisInit() {
  const rafId = useRef<number>(0)

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })

    lenisInstance = lenis

    lenis.on('scroll', () => {
      ScrollTrigger.update()
    })

    function raf(time: number) {
      lenis.raf(time)
      rafId.current = requestAnimationFrame(raf)
    }

    rafId.current = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId.current)
      lenis.destroy()
      lenisInstance = null
    }
  }, [])
}
