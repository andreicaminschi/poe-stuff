import { Modal } from "../components/modal.tsx";
import { useSession } from "../session-store.ts";

export function ConfirmDialog() {
  const confirmation = useSession((state) => state.confirmation);

  if (confirmation === undefined) return null;

  return (
    <Modal
      title="Are you sure?"
      onClose={() => confirmation.settle(false)}
      footer={
        <>
          <button type="button" className="btn" onClick={() => confirmation.settle(false)}>
            Cancel
          </button>
          <button type="button" className="btn primary" autoFocus onClick={() => confirmation.settle(true)}>
            OK
          </button>
        </>
      }
    >
      <p className="grp">{confirmation.message}</p>
    </Modal>
  );
}
