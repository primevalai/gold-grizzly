'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EventMetrics } from '@/hooks/useEventStream';

/**
 * Props for EventVelocityMeter component
 */
interface EventVelocityMeterProps {
  metrics: EventMetrics;
}

/**
 * Real-time event velocity meter with sparkline visualization
 */
export function EventVelocityMeter({ metrics }: EventVelocityMeterProps) {
  // Convert velocity history to chart data
  const chartData = metrics.eventVelocityHistory.map((value, index) => ({
    time: index,
    velocity: value,
  }));

  const maxVelocity = Math.max(...metrics.eventVelocityHistory, 1);
  const currentVelocity = metrics.eventsPerSecond;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          Event Velocity
          <span className="text-2xl font-mono text-primary">
            {currentVelocity}
          </span>
        </CardTitle>
        <CardDescription>
          Events per second (max: {maxVelocity}/s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-16 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="velocity" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                  animationDuration={300}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Collecting velocity data...
            </div>
          )}
        </div>
        
        {/* Velocity Status Indicators */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Low</span>
          <div className="flex-1 mx-2 h-1 bg-muted rounded">
            <div 
              className="h-full bg-primary rounded transition-all duration-300"
              style={{ 
                width: `${Math.min((currentVelocity / maxVelocity) * 100, 100)}%` 
              }}
            />
          </div>
          <span>High</span>
        </div>
      </CardContent>
    </Card>
  );
}