import { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { getLenis } from '@/hooks/useLenis'

gsap.registerPlugin(ScrollTrigger)

/* ─── shaders ─── */

const cardVertexShader = `
uniform float uScrollSpeed;
uniform float uCurveStrength;
uniform float uCurveFrequency;
varying vec2 vUv;
#define PI 3.141592653

void main() {
  vec3 pos = position;
  vec3 worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  float xDisplacement = uCurveStrength * cos(worldPosition.y * uCurveFrequency);
  pos.x += xDisplacement;
  pos.x -= uCurveStrength;
  float yDisplacement = -sin(uv.x * PI) * uScrollSpeed;
  pos.y += yDisplacement;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  vUv = uv;
}
`

const cardFragmentShader = `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uPlaneSizes;
uniform vec2 uImageSizes;
uniform vec3 uColor;
uniform float uBrightness;
varying vec2 vUv;

void main() {
  vec2 ratio = vec2(
    min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
    min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
  );
  vec2 uv = vec2(
    vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );
  vec4 finalColor = texture2D(uTexture, uv);
  finalColor.rgb *= uColor * uBrightness;
  gl_FragColor = finalColor;
}
`

const atmosphericVertexShader = `
attribute vec2 a_position;
varying vec2 v_uv;
const vec2 i = vec2(0.0, 1.0);

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, i.y);
}
`

const atmosphericFragmentShader = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
varying vec2 v_uv;

float circle(vec2 uv, vec2 pos, float radius) {
  vec2 d = uv - pos;
  return 1.0 - smoothstep(radius * 0.8, radius, length(d));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec3 color = vec3(0.05);
  float aspect = u_res.x / u_res.y;
  vec2 uvAspect = vec2(uv.x * aspect, uv.y);
  float t = u_time * 0.15;

  vec2 centers[14];
  vec3 palette[3];
  palette[0] = vec3(1.0, 1.0, 1.0);
  palette[1] = vec3(1.0, 0.55, 0.15);
  palette[2] = vec3(0.95, 0.35, 0.55);

  centers[0] = vec2(0.15 + sin(t * 0.7) * 0.08, 0.80 + cos(t * 0.5) * 0.05);
  centers[1] = vec2(0.85 + cos(t * 0.6) * 0.07, 0.75 + sin(t * 0.8) * 0.06);
  centers[2] = vec2(0.50 + sin(t * 0.9 + 1.0) * 0.10, 0.85 + cos(t * 0.4) * 0.04);
  centers[3] = vec2(0.25 + cos(t * 0.8 + 2.0) * 0.09, 0.65 + sin(t * 0.7 + 1.0) * 0.07);
  centers[4] = vec2(0.70 + sin(t * 0.5 + 3.0) * 0.06, 0.70 + cos(t * 0.9 + 2.0) * 0.08);
  centers[5] = vec2(0.40 + cos(t * 0.7 + 4.0) * 0.11, 0.78 + sin(t * 0.6 + 3.0) * 0.05);
  centers[6] = vec2(0.60 + sin(t * 0.6 + 5.0) * 0.07, 0.82 + cos(t * 0.8 + 4.0) * 0.06);
  centers[7] = vec2(0.10 + cos(t * 0.9 + 1.5) * 0.06, 0.72 + sin(t * 0.5 + 2.5) * 0.07);
  centers[8] = vec2(0.90 + sin(t * 0.8 + 2.5) * 0.05, 0.68 + cos(t * 0.7 + 1.5) * 0.08);
  centers[9] = vec2(0.35 + cos(t * 0.5 + 3.5) * 0.08, 0.88 + sin(t * 0.9 + 0.5) * 0.04);
  centers[10] = vec2(0.65 + sin(t * 0.7 + 4.5) * 0.09, 0.73 + cos(t * 0.6 + 3.5) * 0.06);
  centers[11] = vec2(0.20 + cos(t * 0.8 + 0.5) * 0.07, 0.90 + sin(t * 0.5 + 1.5) * 0.05);
  centers[12] = vec2(0.75 + sin(t * 0.6 + 1.5) * 0.08, 0.77 + cos(t * 0.9 + 4.5) * 0.07);
  centers[13] = vec2(0.50 + cos(t * 0.7 + 2.5) * 0.06, 0.68 + sin(t * 0.8 + 0.5) * 0.09);

  float c;
  c = circle(uvAspect, vec2(centers[0].x * aspect, centers[0].y), 0.18);
  color += palette[1] * c * 0.08;
  c = circle(uvAspect, vec2(centers[1].x * aspect, centers[1].y), 0.15);
  color += palette[2] * c * 0.06;
  c = circle(uvAspect, vec2(centers[2].x * aspect, centers[2].y), 0.20);
  color += palette[0] * c * 0.05;
  c = circle(uvAspect, vec2(centers[3].x * aspect, centers[3].y), 0.14);
  color += palette[1] * c * 0.07;
  c = circle(uvAspect, vec2(centers[4].x * aspect, centers[4].y), 0.16);
  color += palette[2] * c * 0.05;
  c = circle(uvAspect, vec2(centers[5].x * aspect, centers[5].y), 0.19);
  color += palette[0] * c * 0.06;
  c = circle(uvAspect, vec2(centers[6].x * aspect, centers[6].y), 0.13);
  color += palette[1] * c * 0.04;
  c = circle(uvAspect, vec2(centers[7].x * aspect, centers[7].y), 0.17);
  color += palette[2] * c * 0.05;
  c = circle(uvAspect, vec2(centers[8].x * aspect, centers[8].y), 0.14);
  color += palette[0] * c * 0.06;
  c = circle(uvAspect, vec2(centers[9].x * aspect, centers[9].y), 0.15);
  color += palette[1] * c * 0.07;
  c = circle(uvAspect, vec2(centers[10].x * aspect, centers[10].y), 0.18);
  color += palette[2] * c * 0.04;
  c = circle(uvAspect, vec2(centers[11].x * aspect, centers[11].y), 0.12);
  color += palette[0] * c * 0.05;
  c = circle(uvAspect, vec2(centers[12].x * aspect, centers[12].y), 0.16);
  color += palette[1] * c * 0.06;
  c = circle(uvAspect, vec2(centers[13].x * aspect, centers[13].y), 0.14);
  color += palette[2] * c * 0.05;

  float vignette = smoothstep(0.0, 1.0, 1.0 - (length(uv - 0.5) * 0.8));
  color *= vignette;
  color += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.02;

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`

/* ─── constants ─── */
const IMAGES = [
  '/images/project-1.jpg',
  '/images/project-2.jpg',
  '/images/project-3.jpg',
  '/images/project-4.jpg',
  '/images/project-5.jpg',
  '/images/project-6.jpg',
  '/images/project-7.jpg',
  '/images/project-8.jpg',
]

const DEFAULT_CARD_SIZE: [number, number] = [1.4, 1]
const DEFAULT_CARD_SCALE = 0.7
const WHEEL_FACTOR = 1.6
const LERP_FACTOR = 0.1
const CARD_HEIGHT = 1
const CARD_GAP = 1.1
const IMAGE_COUNT = 24 // 3 copies
const TOTAL_HEIGHT = IMAGE_COUNT * CARD_HEIGHT * CARD_GAP
const U_CURVE_STRENGTH = 0.5
const U_CURVE_FREQUENCY = 0.4

const mod = (n: number, m: number) => ((n % m) + m) % m

/* ─── Atmospheric background mesh ─── */
function AtmosphericBackground() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { size } = useThree()

  const uniforms = useMemo(() => ({
    u_time: { value: 0.0 },
    u_res: { value: new THREE.Vector2(size.width * 2, size.height * 2) },
    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
  }), [])

  useEffect(() => {
    uniforms.u_res.value.set(size.width * 2, size.height * 2)
  }, [size, uniforms])

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_time.value += 0.016
    }
  })

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={atmosphericVertexShader}
        fragmentShader={atmosphericFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}

/* ─── Single card ─── */
function GalleryCard({
  texture,
  index,
  imageSizes,
}: {
  texture: THREE.Texture
  index: number
  imageSizes: [number, number]
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    uTexture: { value: texture },
    uScrollSpeed: { value: 0.0 },
    uPlaneSizes: { value: new THREE.Vector2(DEFAULT_CARD_SIZE[0], DEFAULT_CARD_SIZE[1]) },
    uImageSizes: { value: new THREE.Vector2(imageSizes[0], imageSizes[1]) },
    uCurveStrength: { value: U_CURVE_STRENGTH },
    uCurveFrequency: { value: U_CURVE_FREQUENCY },
    uColor: { value: new THREE.Color(1, 1, 1) },
    uBrightness: { value: 1.0 },
  }), [texture, imageSizes])

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.y = (index * CARD_GAP + 0.5) * CARD_HEIGHT
    }
  }, [index])

  return (
    <mesh ref={meshRef} scale={[DEFAULT_CARD_SCALE, DEFAULT_CARD_SCALE, 1]}>
      <planeGeometry args={[DEFAULT_CARD_SIZE[0], DEFAULT_CARD_SIZE[1]]} />
      <shaderMaterial
        vertexShader={cardVertexShader}
        fragmentShader={cardFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/* ─── Card strip ─── */
function CardStrip({
  imageRefs,
  scrollPropsRef,
}: {
  imageRefs: React.MutableRefObject<(THREE.Mesh | null)[]>
  scrollPropsRef: React.MutableRefObject<{
    current: number
    target: number
    speed: number
  }>
}) {
  const listRef = useRef<THREE.Group>(null)
  const textures = useTexture(IMAGES)

  // Build 24 cards (3 copies of 8)
  const cards = useMemo(() => {
    const result: { texture: THREE.Texture; imageIndex: number }[] = []
    for (let copy = 0; copy < 3; copy++) {
      for (let i = 0; i < 8; i++) {
        result.push({ texture: textures[i], imageIndex: i })
      }
    }
    return result
  }, [textures])

  const worldPosition = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    if (!listRef.current) return

    // Apply scroll position
    listRef.current.position.y = -scrollPropsRef.current.current

    // Update each card
    imageRefs.current.forEach((card) => {
      if (!card) return

      // Wrap
      card.position.y = mod(card.position.y + TOTAL_HEIGHT / 2, TOTAL_HEIGHT) - TOTAL_HEIGHT / 2

      // Get world position for scale/brightness
      card.getWorldPosition(worldPosition)

      // Scale
      const scale = new THREE.Vector2(DEFAULT_CARD_SCALE, DEFAULT_CARD_SCALE)
      const floatNormalized = -worldPosition.y / 3.5
      const scaleMultiplier = Math.cos(floatNormalized * Math.PI) * 0.6 + 1
      scale.x *= scaleMultiplier
      scale.y *= scaleMultiplier
      card.scale.set(scale.x, scale.y, 1)

      // Brightness
      const brightness = Math.cos(floatNormalized * Math.PI) * 0.3 + 0.8
      const mat = card.material as THREE.ShaderMaterial
      mat.uniforms.uBrightness.value = brightness
      mat.uniforms.uScrollSpeed.value = scrollPropsRef.current.speed
    })
  })

  return (
    <group ref={listRef}>
      {cards.map((card, idx) => (
        <group
          key={idx}
          ref={(el) => {
            if (el) {
              // Create a mesh wrapper
              const mesh = el.children[0] as THREE.Mesh | undefined
              if (mesh) {
                imageRefs.current[idx] = mesh
              }
            }
          }}
        >
          <GalleryCard
            texture={card.texture}
            index={idx}
            imageSizes={[1024, 768]}
          />
        </group>
      ))}
    </group>
  )
}

/* ─── Gallery scene ─── */
function GalleryScene() {
  const imageRefs = useRef<(THREE.Mesh | null)[]>([])
  const scrollPropsRef = useRef({ current: 0, target: 0, speed: 0 })
  const [targetCameraZ, setTargetCameraZ] = useState(300)
  const { camera } = useThree()

  // Subscribe to Lenis scroll
  useEffect(() => {
    const lenis = getLenis()
    if (!lenis) return

    const onScroll = ({ velocity }: { velocity: number }) => {
      scrollPropsRef.current.target += velocity * 0.005 * WHEEL_FACTOR
    }

    lenis.on('scroll', onScroll)
    return () => {
      lenis.off('scroll', onScroll)
    }
  }, [])

  // Lerp scroll + camera
  useFrame(() => {
    scrollPropsRef.current.current +=
      (scrollPropsRef.current.target - scrollPropsRef.current.current) * LERP_FACTOR
    scrollPropsRef.current.speed =
      scrollPropsRef.current.target - scrollPropsRef.current.current

    // Camera zoom lerp
    camera.position.z += (targetCameraZ - camera.position.z) * 0.07
  })

  // Click outside to reset zoom
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('canvas')) {
        setTargetCameraZ(300)
      }
    }
    window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [])

  return (
    <>
      <AtmosphericBackground />
      <CardStrip imageRefs={imageRefs} scrollPropsRef={scrollPropsRef} />
    </>
  )
}

/* ─── Main section component ─── */
export default function GallerySection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    // Pin the section for 300vh
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: 0.5,
      onUpdate: (self) => {
        setScrollProgress(self.progress)
      },
    })

    // Heading entrance
    if (headingRef.current) {
      gsap.fromTo(
        headingRef.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            once: true,
          },
        }
      )
    }

    return () => {
      trigger.kill()
    }
  }, [])

  const activeIndex = Math.min(
    Math.floor(scrollProgress * 8),
    7
  )

  return (
    <section
      id="gallery"
      ref={sectionRef}
      className="relative w-full h-screen bg-deep overflow-hidden"
    >
      {/* 3D Canvas */}
      <div className="absolute inset-0" style={{ opacity: 0.6 }}>
        <Canvas
          orthographic
          camera={{ position: [0, 0, 300], zoom: 180, near: 0.1, far: 1000 }}
          gl={{ alpha: true, antialias: true }}
          style={{ width: '100%', height: '100%' }}
        >
          <GalleryScene />
        </Canvas>
      </div>

      {/* Overlay content */}
      <div className="absolute inset-0 pointer-events-none z-10">
        {/* Heading */}
        <h2
          ref={headingRef}
          className="absolute top-8 left-1/2 -translate-x-1/2 text-white font-medium mix-blend-difference text-center whitespace-nowrap"
          style={{
            fontSize: '13.5vw',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            textShadow: '0 0 12px rgba(0,0,0,0.8)',
          }}
        >
          SELECTED WORKS
        </h2>

        {/* Bottom metadata bar */}
        <div className="absolute bottom-8 left-0 right-0 px-10 flex items-center justify-between text-white">
          <span className="text-sm opacity-70">Digital Products</span>
          <span className="text-sm">
            {String(activeIndex + 1).padStart(2, '0')} / 08
          </span>
          <span className="text-sm opacity-50">Scroll to explore ↓</span>
        </div>
      </div>
    </section>
  )
}
