import { useMemo, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { useQueries, useQuery } from '@tanstack/react-query';
import { Button, Empty, Select, Space, Spin, Typography } from '@/shared/ui';
import { useNavigate } from 'react-router';

import { fetchAvailableSlots, type AvailableSlot } from '@/features/appointments/api/appointmentsApi';
import { fetchCompanyServices, type Service } from '@/features/services/api/servicesApi';

interface CompanyAvailabilityPreviewProps {
  companyId: string;
}

interface DayRange {
  key: string;
  label: string;
  caption: string;
  from: string;
  to: string;
}

const DAYS_TO_SHOW = 7;
const COLLAPSED_SLOTS_PER_DAY = 2;
const SLOT_QUERY_LIMIT = 8;

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDayRanges(): DayRange[] {
  const today = startOfLocalDay(new Date());

  return Array.from({ length: DAYS_TO_SHOW }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    return {
      key: day.toISOString(),
      label:
        index === 0
          ? 'Today'
          : day.toLocaleDateString([], {
              weekday: 'short',
            }),
      caption: day.toLocaleDateString([], { month: 'short', day: 'numeric' }),
      from: day.toISOString(),
      to: nextDay.toISOString(),
    };
  });
}

function formatSlotTime(value: string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function stopCardNavigation(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  event.stopPropagation();
}

function hasBookableSpecialists(service: Service): boolean {
  return Boolean(service.specialists?.length);
}

export function CompanyAvailabilityPreview({ companyId }: CompanyAvailabilityPreviewProps) {
  const navigate = useNavigate();
  const [requestedServiceId, setRequestedServiceId] = useState<string>();
  const [requestedSpecialistId, setRequestedSpecialistId] = useState<string>();
  const [showMoreHours, setShowMoreHours] = useState(false);
  const dayRanges = useMemo(() => buildDayRanges(), []);

  const { data: services, isLoading } = useQuery({
    queryKey: ['company', companyId, 'services', 'availability-preview'],
    queryFn: () => fetchCompanyServices(companyId),
  });

  const bookableServices = useMemo(
    () => (services ?? []).filter((service) => service.status === 'published' && hasBookableSpecialists(service)),
    [services],
  );

  const selectedService = bookableServices.find((service) => service.id === requestedServiceId) ?? bookableServices[0];
  const specialists = selectedService?.specialists ?? [];
  const selectedServiceId = selectedService?.id;
  const selectedSpecialist = specialists.find((specialist) => specialist.id === requestedSpecialistId) ?? specialists[0];
  const selectedSpecialistId = selectedSpecialist?.id;

  const slotQueries = useQueries({
    queries: dayRanges.map((range) => ({
      queryKey: ['appointments', 'available-slots', companyId, selectedServiceId, selectedSpecialistId, range.key],
      queryFn: () =>
        fetchAvailableSlots({
          companyId,
          serviceId: selectedServiceId!,
          specialistProfileId: selectedSpecialistId!,
          from: range.from,
          to: range.to,
          slotStepMinutes: 15,
          limit: SLOT_QUERY_LIMIT,
        }),
      enabled: Boolean(selectedServiceId && selectedSpecialistId),
      staleTime: 30_000,
    })),
  });

  const isFetchingSlots = slotQueries.some((query) => query.isFetching);
  const hasSlots = slotQueries.some((query) => ((query.data ?? []) as AvailableSlot[]).length > 0);
  const hasHiddenSlots = slotQueries.some(
    (query) => ((query.data ?? []) as AvailableSlot[]).length > COLLAPSED_SLOTS_PER_DAY,
  );

  function handleServiceChange(serviceId: string) {
    const service = bookableServices.find((item) => item.id === serviceId);
    setRequestedServiceId(serviceId);
    setRequestedSpecialistId(service?.specialists?.[0]?.id);
    setShowMoreHours(false);
  }

  function handleSpecialistChange(specialistId: string) {
    setRequestedSpecialistId(specialistId);
    setShowMoreHours(false);
  }

  function toggleMoreHours(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    setShowMoreHours((current) => !current);
  }

  function openBooking(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    if (!selectedServiceId || !selectedSpecialistId) return;
    navigate(`/services/${selectedServiceId}/book?specialistId=${selectedSpecialistId}`);
  }

  return (
    <aside
      className="company-availability-preview"
      aria-label="Available appointment times"
      onClick={stopCardNavigation}
      onKeyDown={stopCardNavigation}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Typography.Text strong>Available appointments</Typography.Text>

        {isLoading ? (
          <Spin size="small" />
        ) : bookableServices.length === 0 ? (
          <Empty description="No appointment times yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            <Space wrap size={8} className="company-availability-preview__controls">
              <Select
                value={selectedServiceId}
                options={bookableServices.map((service) => ({ value: service.id, label: service.name }))}
                onChange={handleServiceChange}
                aria-label="Service"
              />
              <Select
                value={selectedSpecialistId}
                options={specialists.map((specialist) => ({ value: specialist.id, label: specialist.displayName }))}
                onChange={handleSpecialistChange}
                aria-label="Specialist"
              />
            </Space>

            <div className="company-availability-preview__days">
              {dayRanges.map((range, index) => {
                const slots = (slotQueries[index]?.data ?? []) as AvailableSlot[];
                const visibleSlots = showMoreHours ? slots : slots.slice(0, COLLAPSED_SLOTS_PER_DAY);
                const hiddenSlotsCount = slots.length - visibleSlots.length;

                return (
                  <section key={range.key} className="company-availability-preview__day">
                    <div className="company-availability-preview__day-heading">
                      <span>{range.label}</span>
                      <small>{range.caption}</small>
                    </div>
                    <div className="company-availability-preview__slots">
                      {slots.length > 0 ? (
                        <>
                          {visibleSlots.map((slot) => (
                            <Button
                              key={slot.startAt}
                              className="company-availability-preview__slot"
                              onClick={openBooking}
                            >
                              {formatSlotTime(slot.startAt)}
                            </Button>
                          ))}
                          {!showMoreHours && hiddenSlotsCount > 0 && (
                            <span className="company-availability-preview__hidden-count">+{hiddenSlotsCount}</span>
                          )}
                        </>
                      ) : (
                        <span className="company-availability-preview__empty-slot">-</span>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            {hasHiddenSlots && (
              <div className="company-availability-preview__more-wrap">
                <Button className="company-availability-preview__more" onClick={toggleMoreHours}>
                  {showMoreHours ? 'Show fewer hours' : 'Show more hours'}
                </Button>
              </div>
            )}

            {isFetchingSlots && <Spin size="small" />}
            {!isFetchingSlots && !hasSlots && <Empty description="No appointment times yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </>
        )}
      </Space>
    </aside>
  );
}
