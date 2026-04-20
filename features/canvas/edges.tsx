"use client";
import { BaseEdge, getBezierPath, type EdgeProps } from "reactflow";

// Custom edges matching the spec:
// - solid   = direct reference
// - dashed  = inspired-by (stealth)
// - arrow   = continuation (shot → next)
// Colors come from Tailwind vars to match dark theme.

const STYLE_MAP = {
  solid: { stroke: "#3A3A44", dash: "0", strokeWidth: 1.5, animated: false },
  dashed: { stroke: "#5A5D6A", dash: "4 4", strokeWidth: 1.5, animated: false },
  arrow: { stroke: "#A78BFA", dash: "6 3", strokeWidth: 1.8, animated: true },
} as const;

export default function FfEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } =
    props;
  const style = (data?.style ?? "solid") as keyof typeof STYLE_MAP;
  const cfg = STYLE_MAP[style] ?? STYLE_MAP.solid;

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: cfg.stroke,
          strokeWidth: cfg.strokeWidth,
          strokeDasharray: cfg.dash,
          animation: cfg.animated ? "dash-flow 1.5s linear infinite" : undefined,
        }}
        markerEnd={style === "arrow" ? "url(#ff-arrow)" : undefined}
      />
    </>
  );
}

// Arrow marker definition — rendered once per canvas via SvgDefs
export function EdgeMarkers() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <marker
          id="ff-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#A78BFA" />
        </marker>
      </defs>
    </svg>
  );
}
