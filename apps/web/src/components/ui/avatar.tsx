import * as React from 'react';
import { cn } from '@/lib/cn';
import { User } from 'lucide-react';

const avatarSizes = {
  sm: 'h-8 w-8 text-xs',
  default: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
} as const;

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: keyof typeof avatarSizes;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function Avatar({ className, src, alt, name, size = 'default', ...props }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const showImage = src && !imgError;

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full',
        avatarSizes[size],
        className,
      )}
      {...props}
    >
      {showImage ? (
        <img
          className="aspect-square h-full w-full object-cover"
          src={src}
          alt={alt ?? name ?? 'Avatar'}
          onError={() => setImgError(true)}
        />
      ) : name ? (
        <div className="flex h-full w-full items-center justify-center bg-muted font-medium text-muted-foreground">
          {getInitials(name)}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <User className="h-1/2 w-1/2" />
        </div>
      )}
    </div>
  );
}

export { Avatar };
