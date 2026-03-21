import { useCallback, useRef } from "react";
import type { KeyboardEvent } from "react";

type CellKey = `${number}:${number}`;

interface NavigationOptions {
  rowCount: number;
  columnCount: number;
}

export const useKeyboardNavigation = ({
  rowCount,
  columnCount,
}: NavigationOptions) => {
  const refs = useRef(new Map<CellKey, HTMLElement>());

  const keyFor = (rowIndex: number, columnIndex: number) =>
    `${rowIndex}:${columnIndex}` as CellKey;

  const registerCell = useCallback(
    (rowIndex: number, columnIndex: number, element: HTMLElement | null) => {
      const key = keyFor(rowIndex, columnIndex);
      if (!element) {
        refs.current.delete(key);
        return;
      }

      refs.current.set(key, element);
    },
    [],
  );

  const focusCell = useCallback((rowIndex: number, columnIndex: number) => {
    const key = keyFor(rowIndex, columnIndex);
    refs.current.get(key)?.focus();
  }, []);

  const moveBy = useCallback(
    (rowIndex: number, columnIndex: number, rowDelta: number, colDelta: number) => {
      const nextRow = Math.min(Math.max(rowIndex + rowDelta, 0), rowCount - 1);
      const nextCol = Math.min(Math.max(columnIndex + colDelta, 0), columnCount - 1);
      focusCell(nextRow, nextCol);
    },
    [columnCount, focusCell, rowCount],
  );

  const moveTab = useCallback(
    (rowIndex: number, columnIndex: number, backwards = false) => {
      let nextRow = rowIndex;
      let nextCol = columnIndex + (backwards ? -1 : 1);

      if (nextCol >= columnCount) {
        nextCol = 0;
        nextRow = Math.min(rowIndex + 1, rowCount - 1);
      }

      if (nextCol < 0) {
        nextCol = columnCount - 1;
        nextRow = Math.max(rowIndex - 1, 0);
      }

      focusCell(nextRow, nextCol);
    },
    [columnCount, focusCell, rowCount],
  );

  const handleCellKeyDown = useCallback(
    (
      event: KeyboardEvent<HTMLElement>,
      rowIndex: number,
      columnIndex: number,
    ) => {
      if (event.key === "Tab") {
        event.preventDefault();
        moveTab(rowIndex, columnIndex, event.shiftKey);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        moveBy(rowIndex, columnIndex, 1, 0);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveBy(rowIndex, columnIndex, 0, 1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveBy(rowIndex, columnIndex, 0, -1);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveBy(rowIndex, columnIndex, 1, 0);
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveBy(rowIndex, columnIndex, -1, 0);
      }
    },
    [moveBy, moveTab],
  );

  return {
    registerCell,
    handleCellKeyDown,
  };
};
