import useSWR from "swr";
import { useRef, useEffect, useCallback } from "react";

type ScrollFlag = ScrollBehavior | false;

export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: isAtBottom = false, mutate: setIsAtBottom } = useSWR(
    "messages:is-at-bottom",
    null,
    { fallbackData: false }
  );

  const { data: scrollBehavior = false, mutate: setScrollBehavior } =
    useSWR<ScrollFlag>("messages:should-scroll", null, { fallbackData: false });

  useEffect(() => {
    if (scrollBehavior) {
      endRef.current?.scrollIntoView({ behavior: scrollBehavior });
      setScrollBehavior(false);
    }
  }, [scrollBehavior, setScrollBehavior]);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => setScrollBehavior(behavior),
    [setScrollBehavior]
  );

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    onViewportEnter: () => setIsAtBottom(true),
    onViewportLeave: () => setIsAtBottom(false),
  };
}
