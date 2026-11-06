import { create } from 'zustand';
import { Button, Modal } from './ui';

// Cách dùng: const ok = await confirm({ title, message, confirmText, danger })
const useConfirm = create(() => ({ request: null }));

export function confirm(options) {
  return new Promise((resolve) => {
    useConfirm.setState({ request: { ...options, resolve } });
  });
}

export function ConfirmHost() {
  const request = useConfirm((s) => s.request);
  const close = (result) => {
    request?.resolve(result);
    useConfirm.setState({ request: null });
  };
  return (
    <Modal
      open={!!request}
      onClose={() => close(false)}
      title={request?.title || 'Xác nhận'}
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>Không</Button>
          <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus>
            {request?.confirmText || 'Đồng ý'}
          </Button>
        </>
      }
    >
      <p className="text-slate-600 dark:text-slate-300">{request?.message}</p>
    </Modal>
  );
}
