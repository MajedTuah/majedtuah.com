/**
 * The hero's 3D composition: a floating dark-glass rounded-square panel and spheres in charcoal, graphite and
 * obsidian, under soft studio light. Lazy-loaded by Hero so it never blocks the first paint.
 */
import { useEffect, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

type Finish = 'matte' | 'gloss' | 'graphite' | 'glass'

const SPHERES: { pos: [number, number, number]; r: number; finish: Finish; depth: number }[] = [
  { pos: [-2.5, 1.25, -0.6], r: 0.78, finish: 'matte', depth: 0.35 },
  { pos: [2.75, -1.15, 0.5], r: 0.48, finish: 'gloss', depth: 0.6 },
  { pos: [-1.35, -1.55, 0.9], r: 0.34, finish: 'graphite', depth: 0.75 },
  { pos: [2.2, 1.5, -0.3], r: 0.58, finish: 'glass', depth: 0.45 },
  { pos: [1.15, 2.0, 1.1], r: 0.19, finish: 'matte', depth: 0.9 },
  { pos: [-3.0, -0.45, 1.4], r: 0.13, finish: 'gloss', depth: 1 },
]

function SphereMaterial({ finish }: { finish: Finish }) {
  switch (finish) {
    case 'matte': // soft-touch charcoal
      return <meshPhysicalMaterial color="#141416" roughness={0.92} metalness={0} sheen={0.4} sheenRoughness={0.8} sheenColor="#3a3a3e" />
    case 'gloss': // polished obsidian
      return <meshPhysicalMaterial color="#060607" roughness={0.12} metalness={0.15} clearcoat={1} clearcoatRoughness={0.05} />
    case 'graphite': // brushed graphite
      return <meshPhysicalMaterial color="#2c2c2f" roughness={0.42} metalness={0.75} />
    case 'glass': // translucent dark glass
      // smoked glass look without a second transmission pass: dark, glossy, slightly see-through
      return <meshPhysicalMaterial color="#2a2a30" roughness={0.08} metalness={0.1} clearcoat={1} clearcoatRoughness={0.04} transparent opacity={0.72} />
  }
}

/** Everything that moves: floats gently and leans toward the pointer, nearer objects travel further. */
/**
 * Leans toward the pointer; nearer spheres travel further. Renders ON DEMAND: a frame is drawn only while
 * something is still easing toward its target, then the scene goes idle and costs nothing.
 */
function Composition({ eventSource, active, still }: { eventSource: RefObject<HTMLElement | null>; active: boolean; still: boolean }) {
  const group = useRef<THREE.Group>(null)
  const spheres = useRef<(THREE.Group | null)[]>([])
  const target = useRef({ x: 0, y: 0 })
  const invalidate = useThree((s) => s.invalidate)

  // Pointer → target, and wake the render loop
  useEffect(() => {
    const el = eventSource.current
    if (!el || still || !active) return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      target.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
      target.current.y = -(((e.clientY - r.top) / r.height) * 2 - 1)
      invalidate()
    }
    const leave = () => {
      target.current.x = 0
      target.current.y = 0
      invalidate()
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [eventSource, active, still, invalidate])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const k = Math.min(1, delta * 4)
    const { x, y } = target.current
    let moving = false
    const ease = (cur: number, to: number) => {
      const next = THREE.MathUtils.lerp(cur, to, k)
      if (Math.abs(to - next) > 0.0005) moving = true
      return next
    }
    g.rotation.y = ease(g.rotation.y, x * 0.22)
    g.rotation.x = ease(g.rotation.x, -y * 0.12)
    spheres.current.forEach((s, i) => {
      if (!s) return
      const d = SPHERES[i].depth
      s.position.x = ease(s.position.x, x * 0.45 * d)
      s.position.y = ease(s.position.y, y * 0.3 * d)
    })
    if (moving) state.invalidate()
  })

  return (
    <group ref={group}>
      {/* the panel: dark translucent glass with a soft clearcoat */}
      <group>
        <RoundedBox args={[3.3, 3.3, 0.2]} radius={0.2} smoothness={4} position={[0.35, 0.1, -1.3]} rotation={[0.1, -0.32, 0.05]}>
          <meshPhysicalMaterial
            color="#1c1c20"
            transmission={0.85}
            thickness={0.6}
            roughness={0.28}
            ior={1.4}
            clearcoat={1}
            clearcoatRoughness={0.15}
            attenuationColor="#09090b"
            attenuationDistance={0.9}
          />
        </RoundedBox>
      </group>

      {SPHERES.map((s, i) => (
        <group key={i} ref={(el) => void (spheres.current[i] = el)}>
          <mesh position={s.pos}>
            <sphereGeometry args={[s.r, 48, 48]} />
            <SphereMaterial finish={s.finish} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default function HeroScene({ eventSource, active, still }: { eventSource: RefObject<HTMLElement | null>; active: boolean; still: boolean }) {
  return (
    <Canvas
      className="hero-canvas"
      frameloop="demand"
      dpr={[1, 1.25]}
      camera={{ position: [0, 0, 8], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      performance={{ min: 0.6 }}
    >
      {/* extremely soft studio light: a big overhead softbox, two side strips and a faint fill */}
      <ambientLight intensity={0.12} />
      <directionalLight position={[3, 5, 4]} intensity={0.6} color="#f2f2f5" />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, -2]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#e8e8ee" position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[3, 8, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#d8d8de" position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[3, 6, 1]} />
        <Lightformer form="circle" intensity={0.35} color="#ffffff" position={[0, -4, 5]} scale={4} />
      </Environment>
      <Composition eventSource={eventSource} active={active} still={still} />
    </Canvas>
  )
}
