import {
  KeyboardCode,
  type KeyboardCoordinateGetter,
  closestCorners,
  getFirstCollision,
} from "@dnd-kit/core";

const directions: string[] = [KeyboardCode.Down, KeyboardCode.Right, KeyboardCode.Up, KeyboardCode.Left];

/**
 * Multi-container keyboard coordinate getter so arrow keys move a picked-up card
 * between columns (and lanes), not just within its own sortable list.
 * Adapted from the dnd-kit multiple-containers example.
 */
export const multiColumnCoordinateGetter: KeyboardCoordinateGetter = (
  event,
  { context: { active, droppableRects, droppableContainers, collisionRect } }
) => {
  if (!directions.includes(event.code)) return undefined;
  event.preventDefault();
  if (!active || !collisionRect) return undefined;

  const filtered = droppableContainers.getEnabled().filter((entry) => {
    if (!entry || entry.disabled) return false;
    const rect = droppableRects.get(entry.id);
    if (!rect) return false;
    switch (event.code) {
      case KeyboardCode.Down:
        return collisionRect.top < rect.top;
      case KeyboardCode.Up:
        return collisionRect.top > rect.top;
      case KeyboardCode.Left:
        return collisionRect.left >= rect.left + rect.width;
      case KeyboardCode.Right:
        return collisionRect.left + collisionRect.width <= rect.left;
      default:
        return false;
    }
  });

  const collisions = closestCorners({
    active,
    collisionRect,
    droppableRects,
    droppableContainers: filtered,
    pointerCoordinates: null,
  });
  const closestId = getFirstCollision(collisions, "id");

  if (closestId != null) {
    const newRect = droppableRects.get(closestId);
    if (newRect) {
      return { x: newRect.left + 12, y: newRect.top + 12 };
    }
  }

  return undefined;
};
