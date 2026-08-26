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
  const selectedKey = options.some((option) => option.key === currentOptionKey) ? currentOptionKey : undefined;

  return (
    <Select
      className="workspace-switcher"
      aria-label="Workspace"
      loading={loading}
      value={selectedKey}
      placeholder="Workspace"
      optionLabelProp="label"
      popupClassName="workspace-switcher__dropdown"
      onChange={(key) => {
        const option = options.find((entry) => entry.key === key);
        if (option) navigate(option.path);
      }}
      options={options.map((option) => ({
        value: option.key,
        label: option.label,
        className: option.sectionStart ? 'workspace-switcher__section-start' : undefined,
      }))}
    />
  );
}
