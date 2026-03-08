import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      setIsAnimating(true);
      // Short delay to let exit start, then swap content
      const swapTimer = setTimeout(() => {
        setDisplayChildren(children);
        setIsAnimating(false);
        prevPathRef.current = location.pathname;
      }, 150);
      return () => clearTimeout(swapTimer);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isAnimating
          ? "opacity-0 translate-y-2 scale-[0.998]"
          : "opacity-100 translate-y-0 scale-100"
      )}
    >
      {displayChildren}
    </div>
  );
}
