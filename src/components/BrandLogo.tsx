import React from 'react';
import adhivioLogo from '@/assets/adhivio_logo.png';

interface BrandLogoProps {
  layout?: 'stacked' | 'horizontal' | 'icon-only';
  size?: number;
  textColor?: string;
  taglineText?: string;
  taglineColor?: string;
  roundedSquare?: boolean;
  isDarkBg?: boolean;
}

export function BrandLogo({
  layout = 'icon-only',
  size = 32,
  textColor,
  taglineText = 'Smart alerts, better decisions.',
  taglineColor = 'text-[#6B7280] dark:text-[#9CA3AF]',
  roundedSquare = true,
  isDarkBg = false,
}: BrandLogoProps) {

  // Bundled PNG logo asset
  const renderIcon = (iconSize: number) => {
    return (
      <img
        src={adhivioLogo}
        alt="Adhivio Logo"
        width={iconSize}
        height={iconSize}
        className={`flex-shrink-0 object-contain ${roundedSquare ? '' : 'rounded-full'}`}
        style={{ width: iconSize, height: iconSize }}
      />
    );
  };

  if (layout === 'icon-only') {
    return renderIcon(size);
  }

  // Determine text coloring based on dark bg
  const adhiColor = isDarkBg ? 'text-white' : 'text-[#1A1A1A] dark:text-white';
  const vioColor = isDarkBg ? 'text-[#4CAF87]' : 'text-[#E05C5C] dark:text-[#4CAF87]';

  if (layout === 'horizontal') {
    return (
      <div className="flex items-center gap-3 select-none">
        {renderIcon(size)}
        <div className="flex flex-col items-start leading-none gap-0.5 animate-in fade-in duration-300">
          <span className="font-sans font-bold tracking-[-1px] text-[18px] md:text-[20px]">
            <span className={adhiColor}>Adhi</span>
            <span className={vioColor}>vio</span>
          </span>
        </div>
      </div>
    );
  }

  // Stacked Layout (Icon above, wordmark below, with green underline and tagline)
  return (
    <div className="flex flex-col items-center text-center select-none animate-in fade-in duration-300">
      {/* Icon */}
      <div className="mb-4">
        {renderIcon(size)}
      </div>

      {/* Wordmark & Underline & Tagline */}
      <div className="relative flex flex-col items-center">
        <span className="font-sans font-bold tracking-[-1.5px] text-[32px] md:text-[36px] relative pb-2 leading-none">
          <span className="relative">
            <span className={adhiColor}>Adhi</span>
            <span className="absolute left-0 bottom-[-4px] h-[4px] w-full bg-[#4CAF87] rounded-[2px]" />
          </span>
          <span className={vioColor}>vio</span>
        </span>
        
        {/* Tagline */}
        <span className={`text-[11px] font-sans font-normal tracking-normal normal-case mt-3.5 ${taglineColor}`}>
          {taglineText}
        </span>
      </div>
    </div>
  );
}

