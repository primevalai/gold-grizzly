'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Eye, EyeOff } from 'lucide-react';

interface AutoFollowToggleProps {
  isFollowing: boolean;
  onToggle: (following: boolean) => void;
  className?: string;
}

/**
 * Toggle button for auto-follow mode in the EventRiver
 */
export function AutoFollowToggle({ isFollowing, onToggle, className = '' }: AutoFollowToggleProps) {
  return (
    <Button
      variant={isFollowing ? "default" : "outline"}
      size="sm"
      onClick={() => onToggle(!isFollowing)}
      className={`flex items-center space-x-2 ${className}`}
    >
      {isFollowing ? (
        <>
          <Eye className="w-4 h-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <EyeOff className="w-4 h-4" />
          <span>Follow</span>
        </>
      )}
    </Button>
  );
}