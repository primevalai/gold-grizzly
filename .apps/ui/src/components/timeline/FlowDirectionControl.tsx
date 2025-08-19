'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  ArrowLeft, 
  ArrowDown, 
  ArrowUp,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowDirectionControlProps, FlowDirection } from './types';

/**
 * Control component for changing timeline flow direction
 */
export const FlowDirectionControl = memo<FlowDirectionControlProps>(({
  direction,
  onChange,
  className
}) => {
  const directions: { 
    key: FlowDirection; 
    label: string; 
    icon: React.ReactNode; 
    description: string;
  }[] = [
    {
      key: 'left-to-right',
      label: 'L→R',
      icon: <ArrowRight className="w-4 h-4" />,
      description: 'Left to Right'
    },
    {
      key: 'right-to-left',
      label: 'R→L',
      icon: <ArrowLeft className="w-4 h-4" />,
      description: 'Right to Left'
    },
    {
      key: 'top-to-bottom',
      label: 'T→B',
      icon: <ArrowDown className="w-4 h-4" />,
      description: 'Top to Bottom'
    },
    {
      key: 'bottom-to-top',
      label: 'B→T',
      icon: <ArrowUp className="w-4 h-4" />,
      description: 'Bottom to Top'
    }
  ];

  const handleDirectionChange = (newDirection: FlowDirection) => {
    if (newDirection !== direction) {
      onChange(newDirection);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Direction Label */}
      <div className="flex items-center gap-2 mr-2">
        <RotateCcw className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Flow:</span>
      </div>

      {/* Direction Buttons */}
      <div className="flex rounded-md border border-gray-200 overflow-hidden">
        {directions.map((dir) => (
          <Button
            key={dir.key}
            variant={direction === dir.key ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              'rounded-none border-r border-gray-200 last:border-r-0 px-3 py-1',
              direction === dir.key 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'hover:bg-gray-100'
            )}
            onClick={() => handleDirectionChange(dir.key)}
            title={dir.description}
          >
            <div className="flex items-center gap-1">
              {dir.icon}
              <span className="text-xs">{dir.label}</span>
            </div>
          </Button>
        ))}
      </div>

      {/* Current Direction Description */}
      <div className="ml-2 text-xs text-gray-500">
        {directions.find(d => d.key === direction)?.description}
      </div>
    </div>
  );
});

FlowDirectionControl.displayName = 'FlowDirectionControl';