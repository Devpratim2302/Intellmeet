import React from 'react';

interface IntellMeetLogoProps {
  className?: string;
}

export const IntellMeetLogo: React.FC<IntellMeetLogoProps> = ({
  className = 'w-5 h-5 text-white',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="IntellMeet Video Camera Logo"
    >
      {/* Solid Minimalist Camera Body with Negative Space Lens */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.5 5.5H11.5C13.433 5.5 15 7.067 15 9V15C15 16.933 13.433 18.5 11.5 18.5H5.5C3.567 18.5 2 16.933 2 15V9C2 7.067 3.567 5.5 5.5 5.5ZM8.5 9.5C9.88071 9.5 11 10.6193 11 12C11 13.3807 9.88071 14.5 8.5 14.5C7.11929 14.5 6 13.3807 6 12C6 10.6193 7.11929 9.5 8.5 9.5Z"
        fill="currentColor"
      />
      {/* Inner Optical Lens Core Accent */}
      <circle cx="8.5" cy="12" r="1.3" fill="currentColor" />
      {/* Modern Streamlined Projector Lens Cone */}
      <path
        d="M16.5 9.75L20.65 6.82C21.45 6.25 22.5 6.82 22.5 7.81V16.19C22.5 17.18 21.45 17.75 20.65 17.18L16.5 14.25V9.75Z"
        fill="currentColor"
      />
    </svg>
  );
};
