export interface ValidationError {
  type: "missing-parent" | "missing-target" | "missing-position";
  nodeId: string;
  message: string;
  target?: string;
}

export function validateParentReferences(
  checklistFiles: Array<{ fileName: string; parentId: string }>,
  existingNodeIds: Set<string>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const { fileName, parentId } of checklistFiles) {
    if (!existingNodeIds.has(parentId)) {
      errors.push({
        type: "missing-parent",
        nodeId: parentId,
        message: `Checklist file "${fileName}" references non-existent parent "${parentId}"`,
      });
    }
  }

  return errors;
}

export function validateConnectionTargets(
  connections: Array<{ nodeId: string; targetIds: string[] }>,
  existingNodeIds: Set<string>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const { nodeId, targetIds } of connections) {
    for (const targetId of targetIds) {
      if (!existingNodeIds.has(targetId)) {
        errors.push({
          type: "missing-target",
          nodeId,
          target: targetId,
          message: `Node "${nodeId}" connects to non-existent node "${targetId}"`,
        });
      }
    }
  }

  return errors;
}

export function validateNodePositions(
  nodes: Array<{ nodeId: string; hasPosition: boolean }>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const { nodeId, hasPosition } of nodes) {
    if (!hasPosition) {
      errors.push({
        type: "missing-position",
        nodeId,
        message: `Node "${nodeId}" missing layout.position`,
      });
    }
  }

  return errors;
}

export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map((error) => `❌ ${error.message}`);
}

export function logValidationErrors(errors: ValidationError[]): void {
  if (errors.length === 0) return;

  console.error("\n⚠️  Validation errors found:");
  formatValidationErrors(errors).forEach((error) =>
    console.error(`  ${error}`),
  );
  console.error("");
}
