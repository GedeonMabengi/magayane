import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const projects = [
  { name: 'Nebula Finance', categories: 'Web Design, Development', services: 'Creative Direction, Frontend', number: '01', image: '/images/project-1.jpg' },
  { name: 'Maison Noire', categories: 'Fashion, E-commerce', services: 'Web Design, Art Direction', number: '02', image: '/images/project-2.jpg' },
  { name: 'Kinetic Labs', categories: 'Generative Art, Installation', services: 'Creative Coding, Visuals', number: '03', image: '/images/project-3.jpg' },
  { name: 'Solstice', categories: 'Architecture, Portfolio', services: 'Web Design, Typography', number: '04', image: '/images/project-4.jpg' },
  { name: 'Atelier Voss', categories: 'Brand Identity', services: 'Logo Design, Stationery', number: '05', image: '/images/project-5.jpg' },
  { name: 'Phantom', categories: 'Product, 3D', services: '3D Visualization, Rendering', number: '06', image: '/images/project-6.jpg' },
  { name: 'Civic Platform', categories: 'Data, Dashboard', services: 'UI Design, Data Viz', number: '07', image: '/images/project-7.jpg' },
  { name: 'Echo', categories: 'Editorial, Experience', services: 'Creative Direction, Dev', number: '08', image: '/images/project-8.jpg' },
]

export default function WorkListSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [imageLoaded, setImageLoaded] = useState(true)
  const sectionRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const bracketLeftRef = useRef<HTMLDivElement>(null)
  const bracketRightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const items = itemRefs.current.filter(Boolean)
    gsap.fromTo(
      items,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        stagger: 0.05,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          once: true,
        },
      }
    )
  }, [])

  useEffect(() => {
    if (bracketLeftRef.current) {
      gsap.fromTo(
        bracketLeftRef.current,
        { x: -12, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.2, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      )
    }
    if (bracketRightRef.current) {
      gsap.fromTo(
        bracketRightRef.current,
        { x: 12, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.2, ease: 'cubic-bezier(0.16, 1, 0.3, 1)' }
      )
    }
  }, [activeIndex])

  return (
    <section
      id="work"
      ref={sectionRef}
      className="min-h-screen bg-canvas relative"
      style={{ paddingTop: '64px' }}
    >
      <div className="px-10 pt-10 pb-4">
        <div className="flex items-start gap-0">
          {/* Left column - Project names */}
          <div className="w-1/4 pt-4">
            {projects.map((project, i) => (
              <div
                key={project.name}
                ref={(el) => { itemRefs.current[i] = el }}
                className="h-[60px] flex items-center cursor-pointer transition-colors duration-150"
                onMouseEnter={() => {
                  setActiveIndex(i)
                  setImageLoaded(false)
                }}
              >
                <span
                  className={`text-base font-medium transition-colors duration-150 ${
                    i === activeIndex ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {project.name}
                </span>
              </div>
            ))}
          </div>

          {/* Center column - Image with brackets */}
          <div className="w-1/2 flex items-center justify-center min-h-[500px]">
            <div className="flex items-center gap-8">
              {/* Opening bracket */}
              <div
                ref={bracketLeftRef}
                className="flex flex-col items-center"
                style={{ width: '12px', height: '60px' }}
              >
                <div className="w-3 h-0.5 bg-accent self-start" />
                <div className="w-0.5 h-full bg-accent" />
                <div className="w-3 h-0.5 bg-accent self-start" />
              </div>

              {/* Image viewport */}
              <div
                className="relative overflow-hidden"
                style={{ width: '400px', height: '300px' }}
              >
                <img
                  key={activeIndex}
                  src={projects[activeIndex].image}
                  alt={projects[activeIndex].name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                />
              </div>

              {/* Closing bracket */}
              <div
                ref={bracketRightRef}
                className="flex flex-col items-center"
                style={{ width: '12px', height: '60px' }}
              >
                <div className="w-3 h-0.5 bg-accent self-end" />
                <div className="w-0.5 h-full bg-accent" />
                <div className="w-3 h-0.5 bg-accent self-end" />
              </div>
            </div>
          </div>

          {/* Right column - Metadata */}
          <div className="w-1/4 pt-4">
            {projects.map((project, i) => (
              <div
                key={`meta-${project.name}`}
                className={`h-[60px] flex flex-col justify-center transition-opacity duration-300 ${
                  i === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'
                }`}
                style={{ position: i === activeIndex ? 'relative' : 'absolute' }}
              >
                <span className="text-sm font-normal text-ink">{project.categories}</span>
                <span className="text-sm font-normal text-ink">{project.services}</span>
                <span className="text-sm font-medium text-muted absolute right-0 top-1/2 -translate-y-1/2">
                  {project.number}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="underline decoration-ink underline-offset-4">Vertical,</span>
          <span className="text-muted">Horizontal,</span>
          <span className="text-muted">Grid</span>
        </div>
        <span className="text-xs font-normal text-muted">
          All rights reserved. ©2026 Aurélien Marc
        </span>
      </div>
    </section>
  )
}
