"use client";

import { memo } from "react";
import { getBezierPath, type EdgeProps, Position } from "@xyflow/react";

// Base flow color (kept consistent with existing edges)
const FLOW_COLOR = "#35C1B9";
const CHEVRON_SIZE = 40; // Size of the traveling arrow chevrons

/**
 * AnimatedDirectionEdge
 * Custom edge that shows: (1) a dashed, flowing stroke; (2) a static arrow head;
 * (3) 3 small arrow chevrons that traverse the path to indicate forward direction.
 * Uses SVG <animateMotion> for smooth icon travel; falls back to dash animation alone if SMIL unsupported.
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

  const strokeColor = (style?.stroke as string) || FLOW_COLOR;
  const markerId = `animated-direction-arrow-${id}`;
  const pathId = `animated-direction-path-${id}`;

  // Render three travelling arrow chevrons with staggered delays
  const travellingArrows = [0, 0.6, 1.2].map((delay, idx) => (
    <g
      key={idx}
      className="animated-direction-edge-arrow"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Small chevron */}
      <path
        d={`M0 0 L${CHEVRON_SIZE} ${CHEVRON_SIZE / 2} L0 ${CHEVRON_SIZE} Z`}
        fill={strokeColor}
        opacity={0.85}
        transform={`translate(-${CHEVRON_SIZE / 2}, -${CHEVRON_SIZE / 2})`}
      >
        {/* animateMotion for smooth travel along the path */}
        <animateMotion
          dur="8.0s"
          begin={`${delay}s`}
          repeatCount="indefinite"
          rotate="auto"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </path>
    </g>
  ));

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
