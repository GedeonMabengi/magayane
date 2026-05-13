import { useClock } from '@/hooks/useClock'
import { getLenis } from '@/hooks/useLenis'

export default function Navigation() {
  const time = useClock()

  const scrollTo = (id: string) => {
    const lenis = getLenis()
    if (lenis) {
      lenis.scrollTo(id)
    }
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-10 h-16 mix-blend-difference text-white"
    >
      <div className="text-base font-medium tracking-tight">
        AURÉLIEN MARC<span className="text-[0.6rem] align-super ml-0.5">®</span>
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={() => scrollTo('#work')}
          className="text-base font-medium relative group"
        >
          Work
          <span className="absolute bottom-0 left-0 w-0 h-px bg-accent transition-all duration-200 group-hover:w-full" style={{ bottom: '-4px' }} />
        </button>
        <button
          onClick={() => scrollTo('#about')}
          className="text-base font-medium relative group"
        >
          About
          <span className="absolute bottom-0 left-0 w-0 h-px bg-accent transition-all duration-200 group-hover:w-full" style={{ bottom: '-4px' }} />
        </button>
        <span className="text-sm font-normal opacity-70">{time}</span>
      </div>

      <button
        onClick={() => scrollTo('#contact')}
        className="text-base font-medium relative group"
      >
        Contact
        <span className="absolute bottom-0 left-0 w-0 h-px bg-accent transition-all duration-200 group-hover:w-full" style={{ bottom: '-4px' }} />
      </button>
    </nav>
  )
}
