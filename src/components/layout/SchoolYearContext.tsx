import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useCurrentSchoolYear, useSchoolYears } from "../../hooks/useSchoolYears";
import type { SchoolYear } from "../../lib/supabase/types";

interface SchoolYearContextValue {
  schoolYears: SchoolYear[];
  currentSchoolYear: SchoolYear | null;
  selectedSchoolYear: SchoolYear | null;
  selectSchoolYear: (id: string) => void;
  isCurrentYearSelected: boolean;
}

const SchoolYearContext = createContext<SchoolYearContextValue | null>(null);

export const SchoolYearProvider = ({ children }: { children: ReactNode }) => {
  const schoolYearsQuery = useSchoolYears();
  const currentSchoolYearQuery = useCurrentSchoolYear();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const schoolYears = schoolYearsQuery.data ?? [];
  const currentSchoolYear = currentSchoolYearQuery.data ?? null;

  useEffect(() => {
    if (!selectedId && currentSchoolYear) {
      setSelectedId(currentSchoolYear.id);
    }
  }, [selectedId, currentSchoolYear]);

  const selectedSchoolYear = useMemo(
    () => schoolYears.find((year) => year.id === selectedId) ?? currentSchoolYear,
    [schoolYears, selectedId, currentSchoolYear],
  );

  const value = useMemo<SchoolYearContextValue>(
    () => ({
      schoolYears,
      currentSchoolYear,
      selectedSchoolYear,
      selectSchoolYear: setSelectedId,
      isCurrentYearSelected:
        !selectedSchoolYear || !currentSchoolYear
          ? true
          : selectedSchoolYear.id === currentSchoolYear.id,
    }),
    [schoolYears, currentSchoolYear, selectedSchoolYear],
  );

  return <SchoolYearContext.Provider value={value}>{children}</SchoolYearContext.Provider>;
};

export const useSchoolYear = () => {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error("useSchoolYear muss innerhalb von <SchoolYearProvider> verwendet werden.");
  }

  return context;
};
