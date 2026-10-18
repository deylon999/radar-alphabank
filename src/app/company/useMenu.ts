import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Поведение меню по шаблону WAI-ARIA «кнопка + меню»: открытие кликом, Enter, пробелом
 * или стрелками; стрелки, Home и End ходят по пунктам; Esc закрывает и возвращает фокус
 * на кнопку; клик снаружи и Tab закрывают меню.
 */
export function useMenu(itemCount: number, selectedIndex: number) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const focusOnOpen = useRef(0);

  const focusItem = (index: number) => {
    const count = Math.max(itemCount, 1);
    itemRefs.current[((index % count) + count) % count]?.focus();
  };

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const openAt = (index: number) => {
    focusOnOpen.current = index;
    setOpen(true);
  };

  // Пункты появляются после рендера — фокус ставим, когда меню уже в DOM.
  useEffect(() => {
    if (open) {
      itemRefs.current[focusOnOpen.current]?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        close(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  const onTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openAt(event.key === 'ArrowDown' ? selectedIndex : itemCount - 1);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowUp: index - 1,
      Home: 0,
      End: itemCount - 1,
    };
    const target = moves[event.key];
    if (target !== undefined) {
      event.preventDefault();
      focusItem(target);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
  };

  const setItemRef = useCallback((index: number, node: HTMLButtonElement | null) => {
    itemRefs.current[index] = node;
  }, []);

  return {
    open,
    rootRef,
    triggerRef,
    setItemRef,
    toggle: () => {
      if (open) {
        close(false);
      } else {
        openAt(selectedIndex);
      }
    },
    close,
    onTriggerKeyDown,
    onMenuKeyDown,
  };
}
