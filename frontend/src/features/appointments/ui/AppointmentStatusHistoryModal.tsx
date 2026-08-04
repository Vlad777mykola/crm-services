import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, Modal, Spin, Timeline } from 'antd';

import { fetchAppointmentStatusHistory } from '@/features/appointments/api/appointmentsApi';

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

interface AppointmentStatusHistoryModalProps {
  appointmentId: string | null;
  onClose: () => void;
}

export function AppointmentStatusHistoryModal({ appointmentId, onClose }: AppointmentStatusHistoryModalProps) {
  const { data: entries, isLoading, isError, error } = useQuery({
    queryKey: ['appointments', appointmentId, 'status-history'],
    queryFn: () => fetchAppointmentStatusHistory(appointmentId!),
    enabled: Boolean(appointmentId),
  });

  return (
    <Modal title="Appointment status history" open={Boolean(appointmentId)} onCancel={onClose} footer={null} destroyOnClose>
      {isLoading && <Spin style={{ display: 'block', margin: '1rem auto' }} />}
      {isError && (
        <Alert
          type="error"
          message="Failed to load status history"
          description={error instanceof Error ? error.message : 'Unknown error'}
        />
      )}
      {entries && entries.length === 0 && <Empty description="No status history yet" />}
      {entries && entries.length > 0 && (
        <Timeline
          items={entries.map((entry) => ({
            children: (
              <>
                <strong>
                  {entry.fromStatus ? `${entry.fromStatus} \u2192 ${entry.toStatus}` : `Created as ${entry.toStatus}`}
                </strong>
                <div>{formatDate(entry.createdAt)}</div>
              </>
            ),
          }))}
        />
      )}
    </Modal>
  );
}
