import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Checkbox, Empty, Form, Input, List, Select, Space, Spin } from 'antd';
import { Link, useParams } from 'react-router';

import {
  addCompanyTimeBlock,
  addSpecialistTimeBlock,
  deleteCompanyTimeBlock,
  deleteSpecialistTimeBlock,
  fetchCompanyAvailability,
  fetchSpecialistAvailability,
  setCompanyAvailability,
  setSpecialistAvailability,
  type AvailabilityRule,
  type TimeBlock,
} from '@/features/appointments/api/appointmentsApi';
import { fetchCompanySpecialists } from '@/features/company-specialists/api/companySpecialistsApi';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type RuleDraft = Pick<AvailabilityRule, 'weekday' | 'startTime' | 'endTime' | 'timezone' | 'active'>;

function createDraft(rules: AvailabilityRule[] = []): RuleDraft[] {
  return WEEKDAYS.map((_, weekday) => {
    const rule = rules.find((entry) => entry.weekday === weekday && entry.active);
    return {
      weekday,
      startTime: rule?.startTime.slice(0, 5) ?? '09:00',
      endTime: rule?.endTime.slice(0, 5) ?? '18:00',
      timezone: rule?.timezone ?? 'UTC',
      active: Boolean(rule),
    };
  });
}

function toIso(value: string): string {
  return new Date(value).toISOString();
}

function formatRange(block: TimeBlock): string {
  return `${new Date(block.startsAt).toLocaleString()} - ${new Date(block.endsAt).toLocaleString()}`;
}

function RuleEditor({
  rules,
  onChange,
}: {
  rules: RuleDraft[];
  onChange: (rules: RuleDraft[]) => void;
}) {
  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {rules.map((rule, index) => (
        <Space key={rule.weekday} wrap>
          <Checkbox
            checked={rule.active}
            onChange={(event) => {
              const next = [...rules];
              next[index] = { ...rule, active: event.target.checked };
              onChange(next);
            }}
          >
            {WEEKDAYS[rule.weekday]}
          </Checkbox>
          <Input
            type="time"
            value={rule.startTime}
            disabled={!rule.active}
            onChange={(event) => {
              const next = [...rules];
              next[index] = { ...rule, startTime: event.target.value };
              onChange(next);
            }}
            style={{ width: 120 }}
          />
          <Input
            type="time"
            value={rule.endTime}
            disabled={!rule.active}
            onChange={(event) => {
              const next = [...rules];
              next[index] = { ...rule, endTime: event.target.value };
              onChange(next);
            }}
            style={{ width: 120 }}
          />
        </Space>
      ))}
    </Space>
  );
}

function BlockList({
  blocks,
  onDelete,
  deleting,
}: {
  blocks: TimeBlock[];
  onDelete: (blockId: string) => void;
  deleting: boolean;
}) {
  if (blocks.length === 0) return <Empty description="No time blocks" />;
  return (
    <List
      size="small"
      dataSource={blocks}
      renderItem={(block) => (
        <List.Item
          actions={[
            <Button key="delete" size="small" danger loading={deleting} onClick={() => onDelete(block.id)}>
              Remove
            </Button>,
          ]}
        >
          <List.Item.Meta title={formatRange(block)} description={block.reason ?? '-'} />
        </List.Item>
      )}
    />
  );
}

export function CompanyAvailabilityPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const queryClient = useQueryClient();
  const [companyRules, setCompanyRulesDraft] = useState<RuleDraft[]>(createDraft());
  const [specialistRules, setSpecialistRulesDraft] = useState<RuleDraft[]>(createDraft());
  const [specialistProfileId, setSpecialistProfileId] = useState<string>();
  const [companyBlock, setCompanyBlock] = useState({ startsAt: '', endsAt: '', reason: '' });
  const [specialistBlock, setSpecialistBlock] = useState({ startsAt: '', endsAt: '', reason: '' });

  const companyAvailabilityKey = ['company', companyId, 'availability'];
  const specialistAvailabilityKey = ['company', companyId, 'specialist', specialistProfileId, 'availability'];

  const { data: companyAvailability, isLoading, isError, error } = useQuery({
    queryKey: companyAvailabilityKey,
    queryFn: () => fetchCompanyAvailability(companyId!),
    enabled: Boolean(companyId),
  });

  const { data: specialists } = useQuery({
    queryKey: ['company', companyId, 'specialists'],
    queryFn: () => fetchCompanySpecialists(companyId!),
    enabled: Boolean(companyId),
  });

  const { data: specialistAvailability, isFetching: isFetchingSpecialistAvailability } = useQuery({
    queryKey: specialistAvailabilityKey,
    queryFn: () => fetchSpecialistAvailability(companyId!, specialistProfileId!),
    enabled: Boolean(companyId && specialistProfileId),
  });

  useEffect(() => {
    if (companyAvailability) setCompanyRulesDraft(createDraft(companyAvailability.rules));
  }, [companyAvailability]);

  useEffect(() => {
    setSpecialistRulesDraft(createDraft(specialistAvailability?.rules ?? []));
  }, [specialistAvailability]);

  const specialistOptions = useMemo(
    () =>
      (specialists ?? [])
        .filter((entry) => entry.status === 'active' && entry.specialist)
        .map((entry) => ({ value: entry.specialistProfileId, label: entry.specialist!.displayName })),
    [specialists],
  );

  const saveCompanyRules = useMutation({
    mutationFn: () => setCompanyAvailability(companyId!, companyRules.filter((rule) => rule.active)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyAvailabilityKey }),
  });

  const addCompanyBlock = useMutation({
    mutationFn: () =>
      addCompanyTimeBlock(companyId!, {
        startsAt: toIso(companyBlock.startsAt),
        endsAt: toIso(companyBlock.endsAt),
        reason: companyBlock.reason || null,
      }),
    onSuccess: () => {
      setCompanyBlock({ startsAt: '', endsAt: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: companyAvailabilityKey });
    },
  });

  const removeCompanyBlock = useMutation({
    mutationFn: (blockId: string) => deleteCompanyTimeBlock(companyId!, blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: companyAvailabilityKey }),
  });

  const saveSpecialistRules = useMutation({
    mutationFn: () =>
      setSpecialistAvailability(companyId!, specialistProfileId!, specialistRules.filter((rule) => rule.active)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: specialistAvailabilityKey }),
  });

  const addSpecialistBlock = useMutation({
    mutationFn: () =>
      addSpecialistTimeBlock(companyId!, specialistProfileId!, {
        startsAt: toIso(specialistBlock.startsAt),
        endsAt: toIso(specialistBlock.endsAt),
        reason: specialistBlock.reason || null,
      }),
    onSuccess: () => {
      setSpecialistBlock({ startsAt: '', endsAt: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: specialistAvailabilityKey });
    },
  });

  const removeSpecialistBlock = useMutation({
    mutationFn: (blockId: string) => deleteSpecialistTimeBlock(companyId!, specialistProfileId!, blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: specialistAvailabilityKey }),
  });

  if (isLoading) return <Spin style={{ display: 'block', margin: '2rem auto' }} />;

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load availability"
        description={error instanceof Error ? error.message : 'Unknown error'}
        style={{ maxWidth: 720, margin: '2rem auto' }}
      />
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 880, margin: '2rem auto' }}>
      <Card title="Company availability" extra={<Link to={`/company/${companyId}/dashboard`}>Back to dashboard</Link>}>
        <RuleEditor rules={companyRules} onChange={setCompanyRulesDraft} />
        <Button type="primary" loading={saveCompanyRules.isPending} onClick={() => saveCompanyRules.mutate()} style={{ marginTop: 16 }}>
          Save company hours
        </Button>
      </Card>

      <Card title="Company time blocks">
        <Form layout="vertical">
          <Space wrap>
            <Input
              type="datetime-local"
              value={companyBlock.startsAt}
              onChange={(event) => setCompanyBlock((value) => ({ ...value, startsAt: event.target.value }))}
            />
            <Input
              type="datetime-local"
              value={companyBlock.endsAt}
              onChange={(event) => setCompanyBlock((value) => ({ ...value, endsAt: event.target.value }))}
            />
            <Input
              placeholder="Reason"
              value={companyBlock.reason}
              onChange={(event) => setCompanyBlock((value) => ({ ...value, reason: event.target.value }))}
            />
            <Button
              type="primary"
              disabled={!companyBlock.startsAt || !companyBlock.endsAt}
              loading={addCompanyBlock.isPending}
              onClick={() => addCompanyBlock.mutate()}
            >
              Add block
            </Button>
          </Space>
        </Form>
        <BlockList
          blocks={companyAvailability?.blocks ?? []}
          deleting={removeCompanyBlock.isPending}
          onDelete={(blockId) => removeCompanyBlock.mutate(blockId)}
        />
      </Card>

      <Card title="Specialist availability">
        <Select
          options={specialistOptions}
          value={specialistProfileId}
          onChange={setSpecialistProfileId}
          placeholder="Choose specialist"
          style={{ width: '100%', marginBottom: 16 }}
        />
        {isFetchingSpecialistAvailability && <Spin />}
        {specialistProfileId && (
          <>
            <RuleEditor rules={specialistRules} onChange={setSpecialistRulesDraft} />
            <Button
              type="primary"
              loading={saveSpecialistRules.isPending}
              onClick={() => saveSpecialistRules.mutate()}
              style={{ marginTop: 16 }}
            >
              Save specialist hours
            </Button>
          </>
        )}
      </Card>

      {specialistProfileId && (
        <Card title="Specialist time blocks">
          <Space wrap>
            <Input
              type="datetime-local"
              value={specialistBlock.startsAt}
              onChange={(event) => setSpecialistBlock((value) => ({ ...value, startsAt: event.target.value }))}
            />
            <Input
              type="datetime-local"
              value={specialistBlock.endsAt}
              onChange={(event) => setSpecialistBlock((value) => ({ ...value, endsAt: event.target.value }))}
            />
            <Input
              placeholder="Reason"
              value={specialistBlock.reason}
              onChange={(event) => setSpecialistBlock((value) => ({ ...value, reason: event.target.value }))}
            />
            <Button
              type="primary"
              disabled={!specialistBlock.startsAt || !specialistBlock.endsAt}
              loading={addSpecialistBlock.isPending}
              onClick={() => addSpecialistBlock.mutate()}
            >
              Add block
            </Button>
          </Space>
          <BlockList
            blocks={specialistAvailability?.blocks ?? []}
            deleting={removeSpecialistBlock.isPending}
            onDelete={(blockId) => removeSpecialistBlock.mutate(blockId)}
          />
        </Card>
      )}
    </Space>
  );
}
