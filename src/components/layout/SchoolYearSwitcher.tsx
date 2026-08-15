import { Menu } from "../ui/Menu";
import type { MenuItem } from "../ui/Menu";
import { useSchoolYear } from "./SchoolYearContext";

export const SchoolYearSwitcher = () => {
  const { schoolYears, selectedSchoolYear, currentSchoolYear, selectSchoolYear } = useSchoolYear();

  if (schoolYears.length === 0) {
    return null;
  }

  const items: MenuItem[] = schoolYears.map((year) => ({
    kind: "action",
    label: year.id === currentSchoolYear?.id ? `${year.label} (aktuell)` : year.label,
    onSelect: () => selectSchoolYear(year.id),
  }));

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm font-medium text-ink-2 sm:inline">
        {selectedSchoolYear?.label ?? "Schuljahr"}
      </span>
      <Menu items={items} label="Schuljahr wechseln" align="left" />
    </div>
  );
};
