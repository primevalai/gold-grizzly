'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface HeartbeatNodeProps {
  lastHeartbeat: Date | null;
  position?: [number, number, number];
}

export function HeartbeatNode({ lastHeartbeat, position = [0, 6, 0] }: HeartbeatNodeProps) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  // Calculate time since last heartbeat
  const timeSinceHeartbeat = useMemo(() => {
    if (!lastHeartbeat) return 999;
    return (Date.now() - lastHeartbeat.getTime()) / 1000;
  }, [lastHeartbeat]);

  // Determine if connection is alive (heartbeat within 5 seconds)
  const isAlive = timeSinceHeartbeat < 5;

  useFrame((state) => {
    if (sphereRef.current && pulseRef.current) {
      const time = state.clock.elapsedTime;
      
      if (isAlive) {
        // Alive - gentle pulsing
        const pulse = Math.sin(time * 2) * 0.1 + 0.9;
        sphereRef.current.scale.setScalar(pulse);
        
        // Pulse ring effect
        const ringPulse = Math.sin(time * 3) * 0.5 + 1;
        pulseRef.current.scale.setScalar(ringPulse);
        pulseRef.current.material.opacity = (2 - ringPulse) * 0.3;
      } else {
        // Dead - slower, dimmer pulse
        const pulse = Math.sin(time * 0.5) * 0.05 + 0.8;
        sphereRef.current.scale.setScalar(pulse);
        pulseRef.current.scale.setScalar(1);
        pulseRef.current.material.opacity = 0.1;
      }
    }
  });

  const heartbeatColor = isAlive ? '#00ff88' : '#ff4444';
  const glowColor = isAlive ? '#88ffcc' : '#ffaaaa';

  return (
    <group position={position}>
      {/* Main heartbeat sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial 
          color={heartbeatColor}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Pulse ring */}
      <mesh ref={pulseRef}>
        <ringGeometry args={[0.1, 0.15, 16]} />
        <meshBasicMaterial 
          color={glowColor}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Status indicator text */}
      {lastHeartbeat && (
        <Text
          position={[0.3, 0, 0]}
          fontSize={0.06}
          color={heartbeatColor}
          anchorX="left"
          anchorY="middle"
        >
          {isAlive ? '💓 LIVE' : '💀 DEAD'}
        </Text>
      )}
      
      {/* Connection status */}
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.04}
        color={isAlive ? '#66ffaa' : '#ff6666'}
        anchorX="center"
        anchorY="middle"
      >
        {`${timeSinceHeartbeat.toFixed(1)}s ago`}
      </Text>
    </group>
  );
}