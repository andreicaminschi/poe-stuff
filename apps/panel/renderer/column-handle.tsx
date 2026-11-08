import { useRef } from "react";
import type { PointerEvent } from "react";
import type { ColumnSize } from "./read-saved-width.ts";
import { saveWidth } from "./save-width.ts";

type ColumnHandleProps = {
  side: "left" | "right";
  size: ColumnSize;
  width: number;
  onResize: (width: number) => void;
};

export function ColumnHandle({ side, size, width, onResize }: ColumnHandleProps) {
  const dragStart = useRef<{ x: number; width: number } | undefined>(undefined);

  const widthAt = (event: PointerEvent<HTMLDivElement>): number | undefined => {
    const start = dragStart.current;
    if (start === undefined) return undefined;
    const moved = side === "left"
      ? event.clientX - start.x
      : start.x - event.clientX;
    const movedPercent = (moved / window.innerWidth) * 100;
    return Math.min(Math.max(start.width + movedPercent, size.min), size.max);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, width };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const next = widthAt(event);
    if (next !== undefined) onResize(next);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const next = widthAt(event);
    dragStart.current = undefined;
    if (next === undefined) return;
    onResize(next);
    saveWidth(size.key, next);
  };

  return (
    <div
      className="col-handle"
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-valuemin={size.min}
      aria-valuemax={size.max}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
