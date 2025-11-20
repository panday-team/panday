/**
 * Physics-based collision detection and resolution for custom nodes
 * Provides smooth animations when nodes need to move out of the way
 */

interface Position {
  x: number;
  y: number;
}

const REPULSION_STRENGTH = 0.35; // How strongly nodes push each other
const FRICTION = 0.85; // Dampening factor (0-1, higher = more damping)
const MIN_REPULSION_DISTANCE = 200; // Distance at which repulsion kicks in (accounts for labels)
const VELOCITY_THRESHOLD = 0.1; // Stop animating when velocity is very small

/**
 * Calculate repulsion force between two nodes
 */
function calculateRepulsionForce(
  node1: Position,
  node2: Position,
  distance: number,
): { x: number; y: number } {
  if (distance === 0 || distance > MIN_REPULSION_DISTANCE) {
    return { x: 0, y: 0 };
  }

  // Direction vector from node2 to node1
  const dx = node1.x - node2.x;
  const dy = node1.y - node2.y;

  // Normalize direction
  const nx = dx / distance;
  const ny = dy / distance;

  // Force magnitude (inverse square law, clamped)
  const forceMagnitude =
    REPULSION_STRENGTH *
    Math.pow((MIN_REPULSION_DISTANCE - distance) / MIN_REPULSION_DISTANCE, 2);

  return {
    x: nx * forceMagnitude * 50, // Scale for reasonable pixel movement
    y: ny * forceMagnitude * 50,
  };
}

/**
 * Calculate distance between two points
 */
function distance(p1: Position, p2: Position): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Check if two nodes overlap
 */
function checkOverlap(
  pos1: Position,
  size1: number,
  pos2: Position,
  size2: number,
  padding = 20,
): boolean {
  const dist = distance(pos1, pos2);
  const minDistance = (size1 + size2) / 2 + padding;
  return dist < minDistance;
}

/**
 * Resolve collisions using physics simulation
 * Returns adjusted positions for custom nodes that need to move
 */
export function resolveCollisions(
  customNodes: Array<{
    id: string;
    position: Position;
    size: number;
  }>,
  staticNodes: Array<{
    id: string;
    position: Position;
    size: number;
  }>,
  iterations = 50,
): Map<string, Position> {
  // Initialize velocities
  const velocities = new Map<string, { x: number; y: number }>();
  const positions = new Map<string, Position>();

  // Copy initial positions
  for (const node of customNodes) {
    positions.set(node.id, { ...node.position });
    velocities.set(node.id, { x: 0, y: 0 });
  }

  // Run physics simulation
  for (let iter = 0; iter < iterations; iter++) {
    const forces = new Map<string, { x: number; y: number }>();

    // Initialize forces
    for (const node of customNodes) {
      forces.set(node.id, { x: 0, y: 0 });
    }

    // Calculate repulsion from static nodes
    for (const customNode of customNodes) {
      const customPos = positions.get(customNode.id);
      if (!customPos) continue;

      for (const staticNode of staticNodes) {
        const dist = distance(customPos, staticNode.position);
        const repulsion = calculateRepulsionForce(
          customPos,
          staticNode.position,
          dist,
        );

        const currentForce = forces.get(customNode.id) ?? { x: 0, y: 0 };
        forces.set(customNode.id, {
          x: currentForce.x + repulsion.x,
          y: currentForce.y + repulsion.y,
        });
      }

      // Calculate repulsion from other custom nodes
      for (const otherNode of customNodes) {
        if (customNode.id === otherNode.id) continue;

        const otherPos = positions.get(otherNode.id);
        if (!otherPos) continue;

        const dist = distance(customPos, otherPos);
        const repulsion = calculateRepulsionForce(customPos, otherPos, dist);

        const currentForce = forces.get(customNode.id) ?? { x: 0, y: 0 };
        forces.set(customNode.id, {
          x: currentForce.x + repulsion.x,
          y: currentForce.y + repulsion.y,
        });
      }
    }

    // Update velocities and positions
    let maxVelocity = 0;
    for (const node of customNodes) {
      const force = forces.get(node.id) ?? { x: 0, y: 0 };
      const velocity = velocities.get(node.id) ?? { x: 0, y: 0 };

      // Update velocity with force and apply friction
      const newVelocity = {
        x: (velocity.x + force.x) * FRICTION,
        y: (velocity.y + force.y) * FRICTION,
      };

      velocities.set(node.id, newVelocity);

      // Update position
      const pos = positions.get(node.id);
      if (pos) {
        positions.set(node.id, {
          x: pos.x + newVelocity.x,
          y: pos.y + newVelocity.y,
        });
      }

      // Track max velocity for early stopping
      const velMagnitude = Math.sqrt(
        newVelocity.x * newVelocity.x + newVelocity.y * newVelocity.y,
      );
      maxVelocity = Math.max(maxVelocity, velMagnitude);
    }

    // Early stopping if system has settled
    if (maxVelocity < VELOCITY_THRESHOLD) {
      break;
    }
  }

  return positions;
}

/**
 * Detect which custom nodes need repositioning due to expanded category nodes
 */
export function detectCollisions(
  customNodes: Array<{
    id: string;
    position: Position;
  }>,
  expandedCategories: Array<{
    id: string;
    position: Position;
  }>,
  checklistNodes: Array<{
    id: string;
    position: Position;
  }>,
): Set<string> {
  const collidingIds = new Set<string>();
  const CUSTOM_NODE_SIZE = 56;
  const CHECKLIST_SIZE = 64;
  const CATEGORY_SIZE = 96;
  const COLLISION_BUFFER = 80; // Increased to account for node labels

  for (const customNode of customNodes) {
    // Check against expanded categories
    for (const category of expandedCategories) {
      if (
        checkOverlap(
          customNode.position,
          CUSTOM_NODE_SIZE,
          category.position,
          CATEGORY_SIZE,
          COLLISION_BUFFER,
        )
      ) {
        collidingIds.add(customNode.id);
        break;
      }
    }

    // Check against visible checklist nodes
    if (!collidingIds.has(customNode.id)) {
      for (const checklistNode of checklistNodes) {
        if (
          checkOverlap(
            customNode.position,
            CUSTOM_NODE_SIZE,
            checklistNode.position,
            CHECKLIST_SIZE,
            COLLISION_BUFFER,
          )
        ) {
          collidingIds.add(customNode.id);
          break;
        }
      }
    }
  }

  return collidingIds;
}
