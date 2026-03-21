import clsx from "clsx";

export const cn = (...values: Array<string | false | null | undefined>) => clsx(values);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
  }).format(new Date(value));

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
  }).format(value);

