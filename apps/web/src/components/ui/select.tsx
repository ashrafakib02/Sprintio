import * as React from 'react';
import { cn } from '@/lib/cn';
import { ChevronDown } from 'lucide-react';

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a <Select> provider');
  }
  return context;
}

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value: controlledValue, defaultValue = '', onValueChange, children }: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const value = controlledValue ?? uncontrolledValue;
  const handleChange = onValueChange ?? setUncontrolledValue;

  return (
    <SelectContext.Provider
      value={{ value, onValueChange: handleChange, open, onOpenChange: setOpen }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

type SelectTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  const { open, onOpenChange } = useSelectContext();

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      onClick={() => onOpenChange(!open)}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

function SelectValue({ placeholder, className, ...props }: SelectValueProps) {
  const { value } = useSelectContext();

  return (
    <span className={cn('block truncate', !value && 'text-muted-foreground', className)} {...props}>
      {value || placeholder}
    </span>
  );
}

type SelectContentProps = React.HTMLAttributes<HTMLDivElement>;

function SelectContent({ className, children, ...props }: SelectContentProps) {
  const { open, onOpenChange, value, onValueChange } = useSelectContext();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md',
        'animate-in fade-in-0 zoom-in-95',
        className,
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<SelectItemProps>(child) && child.type === SelectItem) {
          const itemProps = child.props as SelectItemProps;
          return React.cloneElement(child, {
            ...itemProps,
            onSelect: () => {
              onValueChange(itemProps.value);
              onOpenChange(false);
            },
            isSelected: itemProps.value === value,
          });
        }
        return child;
      })}
    </div>
  );
}

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  onSelect?: () => void;
  isSelected?: boolean;
}

function SelectItem({ value: _value, className, children, ...props }: SelectItemProps) {
  return (
    <div
      role="option"
      aria-selected={props.isSelected}
      data-state={props.isSelected ? 'active' : 'inactive'}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none',
        'hover:bg-accent hover:text-accent-foreground',
        'data-[state=active]:bg-accent data-[state=active]:text-accent-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SelectSeparator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />;
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectSeparator };
