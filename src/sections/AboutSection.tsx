import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const clients = [
  'Google',
  'Spotify',
  'Airbnb',
  'Stripe',
  'Figma',
  'Vercel',
  'Notion',
  'Linear',
]

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        if (hasAnimated.current) return
        hasAnimated.current = true
        const obj = { val: 0 }
        gsap.to(obj, {
          val: target,
          duration: 1.5,
          ease: 'power2.out',
          onUpdate: () => setCount(Math.round(obj.val)),
        })
      },
    })

    return () => trigger.kill()
  }, [target])

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  )
}

export default function AboutSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const descRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    // Word-by-word heading reveal
    if (headingRef.current) {
      const words = headingRef.current.querySelectorAll('.word')
      gsap.fromTo(
        words,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          stagger: 0.03,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: headingRef.current,
            start: 'top 80%',
            once: true,
          },
        }
      )
    }

    // Description fade in
    if (descRef.current) {
      gsap.fromTo(
        descRef.current,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: descRef.current,
            start: 'top 85%',
            once: true,
          },
        }
      )
    }
  }, [])

  const headingText =
    'Aurélien is a creative developer based in Paris, crafting digital experiences that merge precision engineering with bold visual expression.'

  const words = headingText.split(' ')

  return (
    <section
      id="about"
      ref={sectionRef}
      className="bg-canvas"
      style={{ padding: '80px 40px' }}
    >
      {/* Heading */}
      <h2
        ref={headingRef}
        className="max-w-[1100px] text-ink font-medium"
        style={{
          fontSize: '4.5rem',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
        }}
      >
        {words.map((word, i) => {
          const isLink = word === 'creative' || word === 'developer' || word === 'Paris,'
          return (
            <span
              key={i}
              className={`word inline-block mr-[0.3em] ${
                isLink ? 'underline decoration-ink underline-offset-4' : ''
              }`}
            >
              {word}
            </span>
          )
        })}
      </h2>

      {/* Description */}
      <p
        ref={descRef}
        className="max-w-[700px] text-ink mt-10"
        style={{
          fontSize: '1.125rem',
          lineHeight: 1.65,
          letterSpacing: '-0.01em',
        }}
      >
        With over 8 years of experience, the work spans interactive web experiences,
        generative design systems, and immersive 3D environments. Every project is an
        opportunity to push the boundaries of what the browser can do — blending
        typography, motion, and code into cohesive digital craft.
      </p>

      {/* Stats row */}
      <div className="flex gap-20 mt-20">
        <div>
          <div
            className="text-ink font-medium"
            style={{ fontSize: '2.5rem', letterSpacing: '-0.02em' }}
          >
            <AnimatedCounter target={8} suffix="+" />
          </div>
          <div className="text-sm text-muted mt-1">Years of Craft</div>
        </div>
        <div>
          <div
            className="text-ink font-medium"
            style={{ fontSize: '2.5rem', letterSpacing: '-0.02em' }}
          >
            <AnimatedCounter target={47} />
          </div>
          <div className="text-sm text-muted mt-1">Projects Delivered</div>
        </div>
        <div>
          <div
            className="text-ink font-medium"
            style={{ fontSize: '2.5rem', letterSpacing: '-0.02em' }}
          >
            <AnimatedCounter target={12} />
          </div>
          <div className="text-sm text-muted mt-1">Awards &amp; Features</div>
        </div>
      </div>

      {/* Client marquee */}
      <div className="mt-20 overflow-hidden w-full">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...clients, ...clients].map((client, i) => (
            <span
              key={i}
              className="text-muted font-medium mx-8"
              style={{ fontSize: '2rem' }}
            >
              {client}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
