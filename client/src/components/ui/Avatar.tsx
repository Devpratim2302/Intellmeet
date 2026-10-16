import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base font-semibold',
  xl: 'w-20 h-20 text-xl font-bold',
};

export const Avatar: React.FC<AvatarProps> = ({
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt = 'Avatar',
  className = '',
  fallback,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={`h-full w-full object-cover ${className}`}
      {...props}
    />
  );
};

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({
  name,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-600/30 to-indigo-600/30 font-medium text-brand-300 ${className}`}
      {...props}
    >
      {children ? (
        children
      ) : name ? (
        name.charAt(0).toUpperCase()
      ) : (
        <UserIcon className="w-1/2 h-1/2 text-slate-400" />
      )}
    </div>
  );
};
