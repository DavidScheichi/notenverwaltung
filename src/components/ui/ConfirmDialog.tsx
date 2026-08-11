import { Modal } from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = "Abbrechen",
  tone = "danger",
  isBusy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={title}
    size="sm"
    footer={
      <>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isBusy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === "danger" ? "btn-danger" : "btn-primary"}
          onClick={onConfirm}
          disabled={isBusy}
        >
          {isBusy ? "Wird ausgeführt..." : confirmLabel}
        </button>
      </>
    }
  >
    <p className="text-sm leading-relaxed text-ink-2">{description}</p>
  </Modal>
);
