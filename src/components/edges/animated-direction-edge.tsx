"use client";

import { memo, useMemo } from "react";
import { getBezierPath, type EdgeProps, Position } from "@xyflow/react";

// Animation configuration constants
const ANIMATION_CONFIG = {
  flowColor: "#35C1B9",
  chevronSize: 40,
  chevronOpacity: 0.85,
  animationDuration: "8.0s",
  chevronDelays: [0, 0.6, 1.2], // Staggered delays for 3 traveling chevrons
} as const;

/**
 * AnimatedDirectionEdge
 *
 * Custom edge that shows: (1) a dashed, flowing stroke; (2) a static arrow head;
 * (3) 3 small arrow chevrons that traverse the path to indicate forward direction.
 *
 * Performance Considerations:
 * - Creates 4 concurrent animations per edge (1 path + 3 chevrons)
 * - Uses SVG SMIL animateMotion for smooth icon travel
 * - Component is memoized to prevent unnecessary re-renders
 * - Respects prefers-reduced-motion for accessibility
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/animateMotion
 */
function AnimatedDirectionEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    style,
  } = props;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeColor = (style?.stroke as string) || ANIMATION_CONFIG.flowColor;
  const markerId = `animated-direction-arrow-${id}`;
  const pathId = `animated-direction-path-${id}`;

  // Memoize traveling arrows to avoid recreation on every render
  const travellingArrows = useMemo(
    () =>
      ANIMATION_CONFIG.chevronDelays.map((delay, idx) => (
        <g
          key={idx}
          className="animated-direction-edge-arrow"
          style={{ opacity: 0, animationDelay: `${delay}s` }}
        >
          {/* Small chevron */}
          <path
            d={`M0 0 L${ANIMATION_CONFIG.chevronSize} ${ANIMATION_CONFIG.chevronSize / 2} L0 ${ANIMATION_CONFIG.chevronSize} Z`}
            fill={strokeColor}
            opacity={ANIMATION_CONFIG.chevronOpacity}
            transform={`translate(-${ANIMATION_CONFIG.chevronSize / 2}, -${ANIMATION_CONFIG.chevronSize / 2})`}
          >
            {/* animateMotion for smooth travel along the path */}
            <animateMotion
              dur={ANIMATION_CONFIG.animationDuration}
              begin={`${delay}s`}
              repeatCount="indefinite"
              rotate="auto"
            >
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </path>
        </g>
      )),
    [strokeColor, pathId],
  );

  return (
    <g className="animated-direction-edge">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX={11}
          refY={6}
          markerWidth={40}
          markerHeight={40}
          orient="auto"
        >
          <path d="M2 2 L10 6 L2 10 Z" fill={strokeColor} />
        </marker>
      </defs>
      <path
        id={pathId}
        d={edgePath}
        className="animated-direction-edge-path"
        stroke={strokeColor}
        fill="none"
        markerEnd={`url(#${markerId})`}
        style={style}
      />
      {/* Travelling chevrons */}
      {travellingArrows}
    </g>
  );
}

export default memo(AnimatedDirectionEdge);
