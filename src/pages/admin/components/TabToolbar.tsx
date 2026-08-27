import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SearchInput from './SearchInput';

type TabToolbarProps = {
  description: string;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const TabToolbar = ({
  description, search, onSearchChange, searchPlaceholder, actionLabel, onAction,
}: TabToolbarProps) => (
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
    <p className="text-sm text-muted-foreground">{description}</p>
    <div className="flex items-center gap-2">
      <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="shrink-0">
          <Plus className="w-4 h-4" /> {actionLabel}
        </Button>
      )}
    </div>
  </div>
);

export default TabToolbar;
