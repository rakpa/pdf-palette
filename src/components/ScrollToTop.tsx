import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Resets scroll position on route change so each tool page opens at the top. */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
