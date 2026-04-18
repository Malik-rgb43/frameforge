// Pointer-based drag helpers for the board canvas.
// Uses window-scoped pointer listeners so fast drags don't lose focus
// when the cursor leaves the card. Requires a small threshold (4px)
// before engaging drag to avoid accidental drags on click.

export const DRAG_THRESHOLD_PX = 4;

export interface DragStartInfo {
  /** Pointer screen x at mousedown */
  pointerX: number;
  /** Pointer screen y at mousedown */
  pointerY: number;
  /** Item's starting canvas x */
  originX: number;
  /** Item's starting canvas y */
  originY: number;
  /** Whether Shift was pressed at mousedown (connection-draw mode) */
  shiftAtStart: boolean;
}

export interface DragMoveInfo extends DragStartInfo {
  /** Current pointer x */
  currentX: number;
  /** Current pointer y */
  currentY: number;
  /** Total dx from start */
  dx: number;
  /** Total dy from start */
  dy: number;
  /** Whether Shift is currently held */
  shift: boolean;
}

export interface DragHandlers {
  onMove?: (info: DragMoveInfo) => void;
  onEnd?: (info: DragMoveInfo & { cancelled: boolean; targetEl: HTMLElement | null }) => void;
}

/**
 * Installs pointer listeners on `window` that fire once drag threshold
 * is crossed. Returns a cleanup function that detaches them.
 *
 * The returned promise resolves once the drag ends (pointer-up or
 * escape). Callers can `await` it, or just use the handlers.
 */
export function beginDrag(
  startEvent: PointerEvent | React.PointerEvent,
  start: DragStartInfo,
  handlers: DragHandlers
): () => void {
  let engaged = false;

  function makeInfo(e: PointerEvent | MouseEvent): DragMoveInfo {
    const dx = e.clientX - start.pointerX;
    const dy = e.clientY - start.pointerY;
    return {
      ...start,
      currentX: e.clientX,
      currentY: e.clientY,
      dx,
      dy,
      shift: e.shiftKey,
    };
  }

  function onMove(e: PointerEvent) {
    const info = makeInfo(e);
    if (!engaged) {
      if (Math.abs(info.dx) < DRAG_THRESHOLD_PX && Math.abs(info.dy) < DRAG_THRESHOLD_PX) {
        return;
      }
      engaged = true;
    }
    handlers.onMove?.(info);
  }

  function onUp(e: PointerEvent) {
    cleanup();
    const info = makeInfo(e);
    // Find drop target (element under the cursor, ignoring the dragged card itself)
    const targetEl =
      typeof document !== "undefined"
        ? (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)
        : null;
    handlers.onEnd?.({ ...info, cancelled: !engaged, targetEl });
  }

  function onEsc(e: KeyboardEvent) {
    if (e.key === "Escape") {
      cleanup();
      const info: DragMoveInfo = {
        ...start,
        currentX: start.pointerX,
        currentY: start.pointerY,
        dx: 0,
        dy: 0,
        shift: false,
      };
      handlers.onEnd?.({ ...info, cancelled: true, targetEl: null });
    }
  }

  const cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onEsc);
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "";
    }
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onEsc);

  if (typeof document !== "undefined") {
    document.body.style.userSelect = "none";
  }

  return cleanup;
}

/** Walks up the DOM to find the nearest element tagged with a board item id. */
export function findBoardItemIdFromEl(el: HTMLElement | null): string | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    const id = cur.dataset?.boardItemId;
    if (id) return id;
    cur = cur.parentElement;
  }
  return null;
}
