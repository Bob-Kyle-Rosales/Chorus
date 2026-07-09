"use client"

interface Blob {
  color: string
  size: number
  top?: string
  right?: string
  bottom?: string
  left?: string
  blur: number
  duration: number
  reverse?: boolean
}

const BOLD_BLOBS: Blob[] = [
  { color: "rgba(201,162,74,0.45)", size: 320, top: "-110px", right: "-80px", blur: 6, duration: 7 },
  { color: "rgba(127,184,216,0.35)", size: 260, bottom: "-90px", left: "0px", blur: 6, duration: 9 },
  { color: "rgba(143,203,170,0.3)", size: 180, top: "40%", left: "40%", blur: 8, duration: 8, reverse: true },
]

const FAINT_BLOBS: Blob[] = [
  { color: "rgba(201,162,74,0.18)", size: 260, top: "-100px", right: "-60px", blur: 14, duration: 9 },
  { color: "rgba(127,184,216,0.12)", size: 200, bottom: "-80px", left: "20px", blur: 14, duration: 11 },
]

interface AuroraBackgroundProps {
  intensity: "bold" | "faint"
}

export function AuroraBackground({ intensity }: AuroraBackgroundProps) {
  const blobs = intensity === "bold" ? BOLD_BLOBS : FAINT_BLOBS

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {blobs.map((blob, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: blob.size,
            height: blob.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${blob.color}, transparent 70%)`,
            top: blob.top,
            right: blob.right,
            bottom: blob.bottom,
            left: blob.left,
            filter: `blur(${blob.blur}px)`,
            animation: `chorus-aurora-drift-${i % 2 === 0 ? 1 : 2} ${blob.duration}s ease-in-out infinite${blob.reverse ? " reverse" : ""}`,
          }}
        />
      ))}
      <style>{`
        @keyframes chorus-aurora-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.1); }
        }
        @keyframes chorus-aurora-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, -15px) scale(1.05); }
        }
      `}</style>
    </div>
  )
}
