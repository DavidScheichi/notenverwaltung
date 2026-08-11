import { useCallback, useRef, useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
}

const closedState: ConfirmState = {
  isOpen: false,
  title: "",
  description: "",
};

export const useConfirm = () => {
  const [state, setState] = useState<ConfirmState>(closedState);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(closedState);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({ ...options, isOpen: true });
    });
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      isOpen={state.isOpen}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel ?? "Löschen"}
      tone={state.tone ?? "danger"}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return { confirm, confirmDialog };
};
