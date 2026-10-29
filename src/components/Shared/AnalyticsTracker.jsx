import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../utils/analytics";
import { captureFirstTouch } from "../../utils/firstTouch";

export default function AnalyticsTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    captureFirstTouch();
    trackPageView();
  }, [pathname, search]);

  return null;
}
