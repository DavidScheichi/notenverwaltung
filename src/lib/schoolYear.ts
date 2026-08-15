export const deriveDefaultSchoolYearLabel = (date: Date): string => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indiziert, 7 = August

  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const LABEL_PATTERN = /^(\d{4})\/(\d{4})$/;

export const incrementSchoolYearLabel = (label: string): string => {
  const match = LABEL_PATTERN.exec(label);
  if (!match) {
    return label;
  }

  const start = Number(match[1]) + 1;
  const end = Number(match[2]) + 1;
  return `${start}/${end}`;
};

const CLASS_NAME_PATTERN = /^(\d+)(.*)$/;

export const incrementClassName = (name: string): string => {
  const match = CLASS_NAME_PATTERN.exec(name);
  if (!match) {
    return name;
  }

  const nextNumber = Number(match[1]) + 1;
  return `${nextNumber}${match[2]}`;
};

export const computeCarryoverFundEntry = (
  balance: number,
): { entry_type: "deposit" | "withdrawal"; amount: number } | null => {
  if (balance === 0) {
    return null;
  }

  return balance > 0
    ? { entry_type: "deposit", amount: balance }
    : { entry_type: "withdrawal", amount: -balance };
};
