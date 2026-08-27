import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

const SearchInput = ({
  value, onChange, placeholder = 'Поиск…',
}: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="relative w-full sm:w-64">
    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-8 pr-8 h-9"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label="Очистить поиск"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

export default SearchInput;
