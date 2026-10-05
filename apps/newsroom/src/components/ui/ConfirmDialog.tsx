import { useState } from "react";
import { Button, Field, Modal, textareaCls } from "./primitives";

/** Collects a required typed reason or note before a risky action. */
export function PromptModal({
  title,
  label,
  hint,
  confirmLabel,
  danger,
  minLength = 3,
  onConfirm,
  onClose,
}: {
  title: string;
  label: string;
  hint?: string;
  confirmLabel: string;
  danger?: boolean;
  minLength?: number;
  onConfirm: (text: string) => boolean | void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const valid = text.trim().length >= minLength;
  const submit = () => {
    if (!valid) return;
    if (onConfirm(text) !== false) onClose();
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} disabled={!valid} onClick={submit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label} hint={hint}>
        <textarea className={textareaCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
    </Modal>
  );
}
