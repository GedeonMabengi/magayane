import { useRef, useEffect } from 'react'

/* ─── Shader sources ─── */

const displayVert = `
attribute vec2 a_position;
varying vec2 v_uv;
const vec2 i = vec2(0.0, 1.0);
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, i.y);
}
`

const displayFrag = `
precision highp float;
uniform sampler2D u_fluid;
varying vec2 v_uv;
void main() {
  gl_FragColor = vec4(texture2D(u_fluid, v_uv).rgb, 1.0);
}
`

const advectVert = displayVert

const advectFrag = `
precision highp float;
uniform sampler2D u_source;
uniform sampler2D u_velocity;
uniform float u_dissipation;
uniform float u_dt;
uniform vec4 u_texelSize;
varying vec2 v_uv;

void main() {
  vec2 vel = texture2D(u_velocity, v_uv).xy;
  vec2 result = texture2D(u_source, v_uv - vel * u_dt).xy;
  result *= u_dissipation;
  float aspect = u_texelSize.z / u_texelSize.w;
  vec2 constantVel = vec2(-0.15, -0.08) * vec2(1.0, aspect);
  result += constantVel * u_dt;
  gl_FragColor = vec4(result, 0.0, 1.0);
}
`

const splatVert = displayVert

const splatFrag = `
precision highp float;
uniform vec2 u_point;
uniform float u_radius;
uniform vec2 u_velocity;
uniform vec3 u_color;
uniform float u_strength;
uniform float u_aspectRatio;
varying vec2 v_uv;

void main() {
  vec2 p = v_uv - u_point;
  p.x *= u_aspectRatio;
  float splat = exp(-dot(p, p) / u_radius);
  vec3 vel = splat * u_velocity * u_strength;
  vec3 color = splat * u_color * u_strength;
  gl_FragColor = vec4(vel + color, 0.0, 1.0);
}
`

/* ─── Constants ─── */
const SIM_SCALE = 0.25
const VELOCITY_DISSIPATION = 0.995
const COLOR_DISSIPATION = 0.998
const SENSITIVITY = 12.0
const SPLAT_RADIUS = 0.03
const CLEAR_COLOR = [0.02, 0.02, 0.03]

const FLUID_COLORS: [number, number, number][] = [
  [0.968, 0.149, 0.521],
  [0.447, 0.035, 0.717],
  [0.298, 0.788, 0.941],
  [0.968, 0.788, 0.282],
]

/* ─── Pointer type ─── */
interface Pointer {
  id: number
  texX: number
  texY: number
  prevTexX: number
  prevTexY: number
  deltaX: number
  deltaY: number
  active: boolean
  color: [number, number, number]
  clientX: number
  clientY: number
}

/* ─── Helper: create shader ─── */
function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

/* ─── Helper: create program ─── */
function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
  const vert = createShader(gl, gl.VERTEX_SHADER, vertSrc)
  const frag = createShader(gl, gl.FRAGMENT_SHADER, fragSrc)
  if (!vert || !frag) return null

  const program = gl.createProgram()!
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program))
    return null
  }
  return program
}

/* ─── Helper: create FBO ─── */
function createFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  ext: OES_texture_float | OES_texture_half_float | null
) {
  const texture = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

  const halfFloatExt = ext as OES_texture_half_float | null
  const type = halfFloatExt ? halfFloatExt.HALF_FLOAT_OES : gl.FLOAT

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, null)

  const fbo = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

  return { texture, fbo, width: w, height: h }
}

/* ─── Helper: create double FBO ─── */
function createDoubleFBO(
  gl: WebGLRenderingContext,
  w: number,
  h: number,
  ext: OES_texture_float | OES_texture_half_float | null
) {
  let fbo1 = createFBO(gl, w, h, ext)
  let fbo2 = createFBO(gl, w, h, ext)

  return {
    get read() {
      return fbo1
    },
    get write() {
      return fbo2
    },
    swap() {
      const temp = fbo1
      fbo1 = fbo2
      fbo2 = temp
    },
  }
}

export default function FluidContactSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const pointersRef = useRef<Map<number, Pointer>>(new Map())
  const colorIndexRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
    })
    if (!gl) return

    // Extensions
    const floatExt =
      gl.getExtension('OES_texture_float') ||
      gl.getExtension('OES_texture_half_float')

    // Programs
    const displayProg = createProgram(gl, displayVert, displayFrag)
    const advectProg = createProgram(gl, advectVert, advectFrag)
    const splatProg = createProgram(gl, splatVert, splatFrag)
    if (!displayProg || !advectProg || !splatProg) return

    // Quad geometry
    const quadBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )

    function bindQuad(program: WebGLProgram) {
      const loc = gl!.getAttribLocation(program, 'a_position')
      gl!.bindBuffer(gl!.ARRAY_BUFFER, quadBuffer)
      gl!.enableVertexAttribArray(loc)
      gl!.vertexAttribPointer(loc, 2, gl!.FLOAT, false, 0, 0)
    }

    // Resize
    let simW = 0
    let simH = 0

    function resize() {
      const w = container!.clientWidth
      const h = container!.clientHeight
      const dpr = Math.min(window.devicePixelRatio, 1.5)
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      canvas!.style.width = w + 'px'
      canvas!.style.height = h + 'px'
      simW = Math.round(canvas!.width * SIM_SCALE)
      simH = Math.round(canvas!.height * SIM_SCALE)
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }

    resize()

    // FBOs
    let velocityFBO = createDoubleFBO(gl, simW, simH, floatExt)
    let colorFBO = createDoubleFBO(gl, simW, simH, floatExt)

    // Resize observer
    const ro = new ResizeObserver(() => {
      resize()
      velocityFBO = createDoubleFBO(gl!, simW, simH, floatExt)
      colorFBO = createDoubleFBO(gl!, simW, simH, floatExt)
    })
    ro.observe(container)

    // Pointer handlers
    const aspectX = canvas.width / canvas.height

    function getPointerPos(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect()
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      }
    }

    function onPointerDown(e: PointerEvent) {
      const pos = getPointerPos(e)
      const ptr: Pointer = {
        id: e.pointerId,
        texX: pos.x * aspectX,
        texY: 1.0 - pos.y,
        prevTexX: pos.x * aspectX,
        prevTexY: 1.0 - pos.y,
        deltaX: 0,
        deltaY: 0,
        active: true,
        color: FLUID_COLORS[colorIndexRef.current % FLUID_COLORS.length],
        clientX: e.clientX,
        clientY: e.clientY,
      }
      colorIndexRef.current++
      pointersRef.current.set(e.pointerId, ptr)
      canvas!.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
      const ptr = pointersRef.current.get(e.pointerId)
      if (!ptr) return
      const pos = getPointerPos(e)
      ptr.clientX = e.clientX
      ptr.clientY = e.clientY
      ptr.prevTexX = ptr.texX
      ptr.prevTexY = ptr.texY
      ptr.texX = pos.x * aspectX
      ptr.texY = 1.0 - pos.y
      ptr.deltaX = ptr.texX - ptr.prevTexX
      ptr.deltaY = ptr.texY - ptr.prevTexY
      ptr.active = true
    }

    function onPointerUp(e: PointerEvent) {
      pointersRef.current.delete(e.pointerId)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)

    // Blending
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    /* ─── Render pass helpers ─── */

    function renderPass(
      program: WebGLProgram,
      targetFBO: { fbo: WebGLFramebuffer; width: number; height: number } | null
    ) {
      gl!.useProgram(program)
      bindQuad(program)
      if (targetFBO) {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, targetFBO.fbo)
        gl!.viewport(0, 0, targetFBO.width, targetFBO.height)
      } else {
        gl!.bindFramebuffer(gl!.FRAMEBUFFER, null)
        gl!.viewport(0, 0, canvas!.width, canvas!.height)
      }
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
    }

    function advectionPass(
      sourceTex: WebGLTexture,
      velTex: WebGLTexture,
      dissipation: number,
      targetFBO: { fbo: WebGLFramebuffer; width: number; height: number }
    ) {
      gl!.activeTexture(gl!.TEXTURE0)
      gl!.bindTexture(gl!.TEXTURE_2D, sourceTex)
      gl!.activeTexture(gl!.TEXTURE1)
      gl!.bindTexture(gl!.TEXTURE_2D, velTex)

      gl!.useProgram(advectProg)
      gl!.uniform1i(gl!.getUniformLocation(advectProg!, 'u_source'), 0)
      gl!.uniform1i(gl!.getUniformLocation(advectProg!, 'u_velocity'), 1)
      gl!.uniform1f(gl!.getUniformLocation(advectProg!, 'u_dissipation'), dissipation)
      gl!.uniform1f(gl!.getUniformLocation(advectProg!, 'u_dt'), 0.016)
      gl!.uniform4f(
        gl!.getUniformLocation(advectProg!, 'u_texelSize'),
        1 / targetFBO.width,
        1 / targetFBO.height,
        targetFBO.width,
        targetFBO.height
      )

      renderPass(advectProg!, targetFBO)
    }

    function splatPass(
      sourceTex: WebGLTexture,
      point: [number, number],
      velocity: [number, number],
      color: [number, number, number],
      strength: number,
      targetFBO: { fbo: WebGLFramebuffer; width: number; height: number }
    ) {
      gl!.activeTexture(gl!.TEXTURE0)
      gl!.bindTexture(gl!.TEXTURE_2D, sourceTex)

      gl!.useProgram(splatProg)
      gl!.uniform1i(gl!.getUniformLocation(splatProg!, 'u_source'), 0)
      gl!.uniform2f(gl!.getUniformLocation(splatProg!, 'u_point'), point[0], point[1])
      gl!.uniform1f(gl!.getUniformLocation(splatProg!, 'u_radius'), SPLAT_RADIUS)
      gl!.uniform2f(gl!.getUniformLocation(splatProg!, 'u_velocity'), velocity[0], velocity[1])
      gl!.uniform3f(gl!.getUniformLocation(splatProg!, 'u_color'), color[0], color[1], color[2])
      gl!.uniform1f(gl!.getUniformLocation(splatProg!, 'u_strength'), strength)
      gl!.uniform1f(
        gl!.getUniformLocation(splatProg!, 'u_aspectRatio'),
        canvas!.width / canvas!.height
      )

      renderPass(splatProg!, targetFBO)
    }

    function displayPass(colorTex: WebGLTexture) {
      gl!.activeTexture(gl!.TEXTURE0)
      gl!.bindTexture(gl!.TEXTURE_2D, colorTex)

      gl!.useProgram(displayProg)
      gl!.uniform1i(gl!.getUniformLocation(displayProg!, 'u_fluid'), 0)

      renderPass(displayProg!, null)
    }

    /* ─── Update pointers and inject ─── */
    function updatePointers() {
      const aspectX = canvas!.width / canvas!.height

      pointersRef.current.forEach((ptr) => {
        if (!ptr.active) return

        const velX = ptr.deltaX * SENSITIVITY * aspectX
        const velY = ptr.deltaY * SENSITIVITY * aspectX

        // Splat into color
        splatPass(
          colorFBO.read.texture,
          [ptr.texX, ptr.texY],
          [velX, velY],
          ptr.color,
          0.5,
          colorFBO.write
        )
        colorFBO.swap()

        // Splat into velocity
        splatPass(
          velocityFBO.read.texture,
          [ptr.texX, ptr.texY],
          [velX * 5.0, velY * 5.0],
          [0.0, 0.0, 0.0],
          0.5,
          velocityFBO.write
        )
        velocityFBO.swap()

        ptr.active = false
      })
    }

    /* ─── Main simulation loop ─── */
    function simulateFluid() {
      // 1. Advect velocity
      advectionPass(
        velocityFBO.read.texture,
        velocityFBO.read.texture,
        VELOCITY_DISSIPATION,
        velocityFBO.write
      )
      velocityFBO.swap()

      // 2. Advect color
      advectionPass(
        colorFBO.read.texture,
        velocityFBO.read.texture,
        COLOR_DISSIPATION,
        colorFBO.write
      )
      colorFBO.swap()

      // 3. Inject pointer splats
      updatePointers()

      // 5. Display
      displayPass(colorFBO.read.texture)
    }

    /* ─── Clear initial state ─── */
    function clearFBO(fbo: { fbo: WebGLFramebuffer; width: number; height: number }) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo.fbo)
      gl!.clearColor(CLEAR_COLOR[0], CLEAR_COLOR[1], CLEAR_COLOR[2], 1.0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
    }

    clearFBO(velocityFBO.read)
    clearFBO(velocityFBO.write)
    clearFBO(colorFBO.read)
    clearFBO(colorFBO.write)

    /* ─── Frame loop ─── */
    function frame() {
      simulateFluid()
      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      ro.disconnect()
    }
  }, [])

  return (
    <section
      id="contact"
      ref={containerRef}
      className="relative w-full bg-deep overflow-hidden"
      style={{ height: '100vh' }}
    >
      {/* Fluid canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
      />

      {/* CSS gradient overlay for readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.8) 70%)',
        }}
      />

      {/* Typography overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <h2
          className="text-white font-medium text-center mix-blend-difference"
          style={{
            fontSize: '13.5vw',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            textShadow: '0 0 12px rgba(0,0,0,0.8)',
          }}
        >
          GET IN TOUCH
        </h2>
        <p className="text-white text-sm font-normal opacity-50 mt-4">
          Drag to disturb the surface
        </p>
      </div>

      {/* Contact info */}
      <div className="absolute bottom-20 left-10 z-10">
        <p className="text-white text-base font-normal opacity-70">
          Email: hello@aurelienmarc.com
        </p>
        <p className="text-white text-sm opacity-50 mt-1">
          Based in Paris, France · CEST
        </p>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 px-10 z-10">
        <span className="text-white text-xs font-normal opacity-40">
          ©2026 Aurélien Marc. All rights reserved.
        </span>
      </div>
    </section>
  )
}
