import { useState } from "preact/hooks";
import type { JSX } from "preact";

/** Move one element of a list (pure). `to` is the final index of the moved item. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const out = list.slice();
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

type Drop = { index: number; after: boolean };

/** HTML5 drag-and-drop reorder without deps. Spread `itemProps(i)` on each row; add `rowClass(i)` to its class. */
export function useDragReorder(onMove: (from: number, to: number) => void, enabled = true) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [drop, setDrop] = useState<Drop | null>(null);
  const reset = () => {
    setDragging(null);
    setDrop(null);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemProps = (i: number): JSX.HTMLAttributes<any> => {
    if (!enabled) return {};
    return {
      draggable: true,
      onDragStart: (e: DragEvent) => {
        setDragging(i);
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", String(i));
        }
      },
      onDragOver: (e: DragEvent) => {
        if (dragging == null) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        // Grid cards: split left/right on wide items; list rows: split top/bottom.
        const horizontal = rect.width <= rect.height * 1.6;
        const after = horizontal ? e.clientX > rect.left + rect.width / 2 : e.clientY > rect.top + rect.height / 2;
        if (!drop || drop.index !== i || drop.after !== after) setDrop({ index: i, after });
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault();
        if (dragging != null && drop) {
          let to = drop.index + (drop.after ? 1 : 0);
          if (dragging < to) to -= 1;
          if (to !== dragging) onMove(dragging, to);
        }
        reset();
      },
      onDragEnd: reset,
    };
  };
  const rowClass = (i: number) =>
    [dragging === i ? "is-dragging" : "", drop?.index === i && dragging !== i ? (drop.after ? "drop-after" : "drop-before") : ""]
      .filter(Boolean)
      .join(" ");
  return { itemProps, rowClass, active: dragging != null };
}
