import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

const GuideTourContext = createContext();
export const useGuideTour = () => useContext(GuideTourContext);

const getUserScopeId = (user) =>
  user?._id || user?.id || user?.tenantId || "default";

const getSeenKey = (tourId, userScopeId) =>
  `wisershifts_guide_seen_${tourId}_${userScopeId}`;

export function GuideTourProvider({ children }) {
  const { user } = useAuth();
  const userScopeId = getUserScopeId(user);
  const [activeTour, setActiveTour] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  const hasSeenTour = useCallback(
    (tourId) => {
      try {
        return localStorage.getItem(getSeenKey(tourId, userScopeId)) === "1";
      } catch {
        return false;
      }
    },
    [userScopeId],
  );

  const markTourSeen = useCallback(
    (tourId) => {
      try {
        localStorage.setItem(getSeenKey(tourId, userScopeId), "1");
      } catch {
        // localStorage unavailable — tour will just auto-launch again next visit
      }
    },
    [userScopeId],
  );

  const startTour = useCallback((tourId, steps) => {
    if (!Array.isArray(steps) || !steps.length) return;
    setActiveTour({ tourId, steps });
    setStepIndex(0);
  }, []);

  const endTour = useCallback(() => {
    if (activeTour) markTourSeen(activeTour.tourId);
    setActiveTour(null);
    setStepIndex(0);
  }, [activeTour, markTourSeen]);

  const nextStep = useCallback(() => {
    if (!activeTour) return;
    if (stepIndex >= activeTour.steps.length - 1) {
      endTour();
      return;
    }
    setStepIndex((prev) => prev + 1);
  }, [activeTour, stepIndex, endTour]);

  const prevStep = useCallback(() => {
    setStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Auto-launch is a no-op if the tour was already seen by this user.
  const startTourIfUnseen = useCallback(
    (tourId, steps) => {
      if (hasSeenTour(tourId)) return;
      startTour(tourId, steps);
    },
    [hasSeenTour, startTour],
  );

  const value = useMemo(
    () => ({
      activeTour,
      stepIndex,
      startTour,
      startTourIfUnseen,
      endTour,
      nextStep,
      prevStep,
      hasSeenTour,
    }),
    [
      activeTour,
      stepIndex,
      startTour,
      startTourIfUnseen,
      endTour,
      nextStep,
      prevStep,
      hasSeenTour,
    ],
  );

  return (
    <GuideTourContext.Provider value={value}>
      {children}
    </GuideTourContext.Provider>
  );
}
