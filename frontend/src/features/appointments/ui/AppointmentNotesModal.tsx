import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Input, Modal } from 'antd';

import { updateAppointmentNotes } from '@/features/appointments/api/appointmentsApi';

interface AppointmentNotesModalProps {
  companyId: string;
  appointmentId: string | null;
  initialNotes: string | null;
  onClose: () => void;
  invalidateQueryKey: unknown[];
}

export function AppointmentNotesModal(props: AppointmentNotesModalProps) {
  if (!props.appointmentId) {
    return null;
  }

  return <AppointmentNotesModalContent key={props.appointmentId} {...props} appointmentId={props.appointmentId} />;
}

function AppointmentNotesModalContent({
  companyId,
  appointmentId,
  initialNotes,
  onClose,
  invalidateQueryKey,
}: Omit<AppointmentNotesModalProps, 'appointmentId'> & { appointmentId: string }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(initialNotes ?? '');

  const mutation = useMutation({
    mutationFn: () => updateAppointmentNotes(companyId, appointmentId, notes.trim() === '' ? null : notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      onClose();
    },
  });

  return (
    <Modal
      title="Edit appointment notes"
      open
      onCancel={onClose}
      onOk={() => mutation.mutate()}
      confirmLoading={mutation.isPending}
      destroyOnClose
    >
      {mutation.isError && (
        <Alert
          type="error"
          message={mutation.error instanceof Error ? mutation.error.message : 'Failed to update notes'}
          style={{ marginBottom: 12 }}
          showIcon
        />
      )}
      <Input.TextArea
        rows={4}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Internal notes about this appointment"
      />
    </Modal>
  );
}
