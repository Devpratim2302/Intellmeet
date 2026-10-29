import React from 'react';

interface IntellMeetLogoProps {
  className?: string;
  alt?: string;
}

export const IntellMeetLogo: React.FC<IntellMeetLogoProps> = ({
  className = 'w-10 h-10',
  alt = 'IntellMeet Logo',
}) => {
  return (
    <img
      src="/intellmeet-logo.png"
      alt={alt}
      className={`rounded-2xl object-contain select-none shrink-0 ${className}`}
      draggable={false}
    />
  );
};
