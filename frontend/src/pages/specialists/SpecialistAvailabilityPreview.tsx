import { useMemo, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';

import { useQueries } from '@tanstack/react-query';
import { Button, Empty, Select, Space, Spin, Typography } from '@/shared/ui';
import { useNavigate } from 'react-router';

import { fetchAvailableSlots, type AvailableSlot } from '@/features/appointments/api/appointmentsApi';
import type { PublicSpecialistCompany } from '@/features/specialists/api/specialistsApi';

interface SpecialistAvailabilityPreviewProps {
  specialistProfileId: string;
  companies: PublicSpecialistCompany[];
}

interface DayRange {
  key: string;
  label: string;
  caption: string;
  from: string;
  to: string;
}

const DAYS_TO_SHOW = 14;
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

export function SpecialistAvailabilityPreview({ specialistProfileId, companies }: SpecialistAvailabilityPreviewProps) {
  const navigate = useNavigate();
  const [requestedCompanyId, setRequestedCompanyId] = useState<string>();
  const [requestedServiceId, setRequestedServiceId] = useState<string>();
  const [showAllTimes, setShowAllTimes] = useState(false);
  const dayRanges = useMemo(() => buildDayRanges(), []);

  const bookableCompanies = useMemo(
    () => companies.filter((company) => company.services.length > 0),
    [companies],
  );

  const selectedCompany = bookableCompanies.find((company) => company.id === requestedCompanyId) ?? bookableCompanies[0];
  const services = selectedCompany?.services ?? [];
  const selectedCompanyId = selectedCompany?.id;
  const selectedService = services.find((service) => service.id === requestedServiceId) ?? services[0];
  const selectedServiceId = selectedService?.id;

  const slotQueries = useQueries({
    queries: dayRanges.map((range) => ({
      queryKey: [
        'appointments',
        'available-slots',
        selectedCompanyId,
        selectedServiceId,
        specialistProfileId,
        range.key,
      ],
      queryFn: () =>
        fetchAvailableSlots({
          companyId: selectedCompanyId!,
          serviceId: selectedServiceId!,
          specialistProfileId,
          from: range.from,
          to: range.to,
          slotStepMinutes: 15,
          limit: SLOT_QUERY_LIMIT,
        }),
      enabled: Boolean(selectedCompanyId && selectedServiceId),
      staleTime: 30_000,
    })),
  });

  const isFetchingSlots = slotQueries.some((query) => query.isFetching);
  const hasSlots = slotQueries.some((query) => ((query.data ?? []) as AvailableSlot[]).length > 0);
  const hasHiddenSlots = slotQueries.some(
    (query) => ((query.data ?? []) as AvailableSlot[]).length > COLLAPSED_SLOTS_PER_DAY,
  );

  function handleCompanyChange(companyId: string) {
    const company = bookableCompanies.find((item) => item.id === companyId);
    setRequestedCompanyId(companyId);
    setRequestedServiceId(company?.services[0]?.id);
    setShowAllTimes(false);
  }

  function handleServiceChange(serviceId: string) {
    setRequestedServiceId(serviceId);
    setShowAllTimes(false);
  }

  function toggleAllTimes(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    setShowAllTimes((current) => !current);
  }

  function openBooking(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
    if (!selectedServiceId) return;
    navigate(`/services/${selectedServiceId}/book?specialistId=${specialistProfileId}`);
  }

  return (
    <aside
      className="company-availability-preview"
      aria-label="Available appointment times"
      onClick={stopCardNavigation}
      onKeyDown={stopCardNavigation}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div className="company-availability-preview__summary">
          <Typography.Text strong>Next available</Typography.Text>
          {selectedService && <span>{selectedService.name}</span>}
        </div>

        {bookableCompanies.length === 0 ? (
          <Empty description="No appointment times yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            <Space wrap size={8} className="company-availability-preview__controls">
              <Select
                value={selectedCompanyId}
                options={bookableCompanies.map((company) => ({ value: company.id, label: company.name }))}
                onChange={handleCompanyChange}
                aria-label="Company"
              />
              <Select
                value={selectedServiceId}
                options={services.map((service) => ({ value: service.id, label: service.name }))}
                onChange={handleServiceChange}
                aria-label="Service"
              />
            </Space>

            <div className="company-availability-preview__days">
              {dayRanges.map((range, index) => {
                const slots = (slotQueries[index]?.data ?? []) as AvailableSlot[];
                const visibleSlots = showAllTimes ? slots : slots.slice(0, COLLAPSED_SLOTS_PER_DAY);
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
                          {!showAllTimes && hiddenSlotsCount > 0 && (
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
              <section className="company-availability-preview__calendar-day">
                <Button className="company-availability-preview__calendar-button" onClick={openBooking}>
                  See full calendar
                </Button>
              </section>
            </div>

            {hasHiddenSlots && (
              <div className="company-availability-preview__more-wrap">
                <Button className="company-availability-preview__more" onClick={toggleAllTimes}>
                  {showAllTimes ? 'Show fewer times' : 'Show all times'}
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
