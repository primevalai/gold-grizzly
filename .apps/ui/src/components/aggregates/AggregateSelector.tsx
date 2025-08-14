'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Layers, GitBranch, Bot, Server, Grid3x3 } from 'lucide-react';

export type AggregateView = 'all' | 'workflow' | 'agent' | 'system';

interface AggregateSelectorProps {
  currentView: AggregateView;
  onViewChange: (view: AggregateView) => void;
  counts?: {
    workflow: number;
    agent: number;
    system: number;
  };
  className?: string;
}

const VIEW_CONFIG = {
  all: {
    label: 'All Events',
    icon: Grid3x3,
    color: 'bg-gray-500',
    borderColor: 'border-gray-500',
    bgHover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
    bgActive: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400'
  },
  workflow: {
    label: 'Workflows',
    icon: GitBranch,
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
    bgActive: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400'
  },
  agent: {
    label: 'Agents',
    icon: Bot,
    color: 'bg-purple-500',
    borderColor: 'border-purple-500',
    bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
    bgActive: 'bg-purple-100 dark:bg-purple-900/30',
    textColor: 'text-purple-600 dark:text-purple-400'
  },
  system: {
    label: 'System',
    icon: Server,
    color: 'bg-gray-500',
    borderColor: 'border-gray-500',
    bgHover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
    bgActive: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400'
  }
};

export function AggregateSelector({ 
  currentView, 
  onViewChange, 
  counts,
  className = '' 
}: AggregateSelectorProps) {
  const totalCount = counts 
    ? counts.workflow + counts.agent + counts.system 
    : 0;

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Aggregate View
          </h3>
        </div>
        {counts && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {totalCount} total events
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(Object.keys(VIEW_CONFIG) as AggregateView[]).map((view) => {
          const config = VIEW_CONFIG[view];
          const Icon = config.icon;
          const isActive = currentView === view;
          const count = view === 'all' ? totalCount : counts?.[view as keyof typeof counts];

          return (
            <motion.button
              key={view}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onViewChange(view)}
              className={`relative p-3 rounded-lg border-2 transition-all
                         ${isActive 
                           ? `${config.borderColor} ${config.bgActive} ${config.textColor}` 
                           : `border-transparent ${config.bgHover}`}
                         group`}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`relative p-2 rounded-lg ${isActive ? config.color : 'bg-gray-200 dark:bg-gray-700'} 
                               bg-opacity-20 transition-colors`}>
                  <Icon className={`w-5 h-5 ${isActive ? config.textColor : 'text-gray-500 dark:text-gray-400'}`} />
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute inset-0 rounded-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900"
                    />
                  )}
                </div>
                
                <div className="text-center">
                  <div className={`text-xs font-medium ${isActive ? config.textColor : 'text-gray-700 dark:text-gray-300'}`}>
                    {config.label}
                  </div>
                  {count !== undefined && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {count} events
                    </div>
                  )}
                </div>
              </div>

              {isActive && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  className={`absolute bottom-0 left-0 h-0.5 ${config.color}`}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">Active Filter:</span>
          <span className={`font-medium ${VIEW_CONFIG[currentView].textColor}`}>
            {VIEW_CONFIG[currentView].label}
          </span>
        </div>
        
        {currentView !== 'all' && (
          <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
            Showing only {currentView} aggregate events
          </div>
        )}
      </div>
    </div>
  );
}