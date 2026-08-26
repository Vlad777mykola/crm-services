import { Select } from 'antd';
import { useNavigate } from 'react-router';

import type { WorkspaceOption } from '@/widgets/navigation/model/types';

import './navigation.css';

interface WorkspaceSwitcherProps {
  currentOptionKey: string;
  options: WorkspaceOption[];
  loading?: boolean;
}

export function WorkspaceSwitcher({ currentOptionKey, options, loading }: WorkspaceSwitcherProps) {
  const navigate = useNavigate();

  return (
    <Select
      className="workspace-switcher"
      aria-label="Workspace"
      loading={loading}
      value={options.some((option) => option.key === currentOptionKey) ? currentOptionKey : undefined}
      placeholder="Workspace"
      optionLabelProp="label"
      onChange={(key) => {
        const option = options.find((entry) => entry.key === key);
        if (option) navigate(option.path);
      }}
      options={options.map((option) => ({
        value: option.key,
        label: option.label,
      }))}
    />
  );
}
