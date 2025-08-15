'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Event3D } from '@/hooks/useEventStream3D';

interface EventForkProps {
  agentId: string;
  events: Event3D[];
  workflowForkPosition: THREE.Vector3;
  index: number; // Index among siblings for positioning
  onClick?: (agentId: string) => void;
}

/**
 * EventFork component - creates a small branch from workflow forks for agent events
 */
export function EventFork({ 
  agentId, 
  events, 
  workflowForkPosition, 
  index,
  onClick 
}: EventForkProps) {
  const forkRef = useRef<THREE.Group>(null);
  const [showLabel, setShowLabel] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Get agent events
  const agentEvents = useMemo(() => {
    return events.filter(e => 
      e.aggregate.toLowerCase() === 'agent' && 
      (e.attributes?.AGENT_ID === agentId || e.id === agentId)
    );
  }, [events, agentId]);
  
  // Determine agent status
  const agentStatus = useMemo(() => {
    if (agentEvents.some(e => e.eventName.includes('failed'))) return 'failed';
    if (agentEvents.some(e => e.eventName.includes('completed'))) return 'completed';
    if (agentEvents.some(e => e.eventName.includes('started') || e.eventName.includes('executing'))) return 'active';
    return 'idle';
  }, [agentEvents]);
  
  // Get agent name from events
  const agentName = useMemo(() => {
    const nameFromAttributes = agentEvents[0]?.attributes?.AGENT_NAME;
    if (nameFromAttributes) return nameFromAttributes;
    
    // Try to extract from event name
    const eventName = agentEvents[0]?.eventName;
    if (eventName?.includes('_')) {
      return eventName.split('_')[0];
    }
    
    return agentId.split('-')[0] || 'agent';
  }, [agentEvents, agentId]);
  
  // Position relative to workflow fork (spread out agents with better visual separation)
  const relativePosition = useMemo(() => {
    const offsetAngle = (index * Math.PI * 2 / 4) + Math.PI / 4; // Spread around workflow in 4 directions
    const radius = 1.2 + (index % 2) * 0.4; // Greater distance with variation
    return new THREE.Vector3(
      Math.cos(offsetAngle) * radius,
      -0.3 - (index * 0.3), // More pronounced downward cascade
      Math.sin(offsetAngle) * 0.3 // More 3D depth
    );
  }, [index]);
  
  // Create mini fork path - branch from workflow fork to full agent position
  const forkPath = useMemo(() => {
    const points = [];
    const start = new THREE.Vector3(0, 0, 0);
    const end = relativePosition; // Use full relative position, not scaled down
    
    // Curved line from workflow fork to agent node with more pronounced branching
    for (let i = 0; i <= 15; i++) {
      const progress = i / 15;
      const point = start.clone().lerp(end, progress);
      // Add more pronounced curve for better visual separation
      const curveIntensity = Math.sin(progress * Math.PI) * 0.2;
      point.x += curveIntensity * (end.x > 0 ? 1 : -1); // Curve in direction of branch
      point.z += curveIntensity * 0.1; // Slight 3D curve
      points.push(point);
    }
    return points;
  }, [relativePosition]);
  
  const forkGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(forkPath);
  }, [forkPath]);
  
  // Color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#ff8800';
      case 'completed': return '#44aa44';
      case 'failed': return '#dd3333';
      default: return '#888888';
    }
  };
  
  const statusColor = getStatusColor(agentStatus);
  const endPosition = forkPath[forkPath.length - 1];
  
  // Animation for active agents
  useFrame((state) => {
    if (forkRef.current && agentStatus === 'active') {
      const pulse = Math.sin(state.clock.elapsedTime * 4 + index) * 0.1 + 1;
      forkRef.current.scale.setScalar(pulse);
    }
  });
  
  const handleClick = () => {
    setShowLabel(!showLabel);
    onClick?.(agentId);
  };
  
  return (
    <group ref={forkRef} position={workflowForkPosition}>
      {/* Mini fork branch line */}
      <line>
        <primitive object={forkGeometry} />
        <lineBasicMaterial
          color={statusColor}
          transparent
          opacity={agentStatus === 'idle' ? 0.3 : 0.7}
        />
      </line>
      
      {/* Energy particles for active agents */}
      {agentStatus === 'active' && (
        <points position={endPosition}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(
                Array.from({ length: 15 }, (_, i) => {
                  const angle = (i / 5) * Math.PI * 2;
                  const radius = 0.05;
                  return i % 3 === 0 ? Math.cos(angle) * radius :
                         i % 3 === 1 ? Math.sin(angle) * radius : 0;
                })
              ), 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.02}
            color={statusColor}
            transparent
            opacity={0.8}
          />
        </points>
      )}
      
      {/* Agent node */}
      <mesh
        position={endPosition}
        onClick={handleClick}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        scale={isHovered ? 1.3 : 1}
      >
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial
          color={statusColor}
          transparent
          opacity={0.9}
          emissive={statusColor}
          emissiveIntensity={agentStatus === 'active' ? 0.4 : 0.1}
        />
      </mesh>
      
      {/* Progress indicator ring for active agents */}
      {agentStatus === 'active' && (
        <mesh position={endPosition} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.05, 0.06, 16]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
      
      {/* Agent ID and info label */}
      {showLabel && (
        <group position={[endPosition.x, endPosition.y + 0.2, endPosition.z]}>
          <mesh>
            <planeGeometry args={[1.2, 0.25]} />
            <meshBasicMaterial 
              color="#000000" 
              transparent 
              opacity={0.85} 
            />
          </mesh>
          <Text
            position={[0, 0.03, 0.01]}
            fontSize={0.06}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {String(agentName)}
          </Text>
          <Text
            position={[0, -0.03, 0.01]}
            fontSize={0.04}
            color="#cccccc"
            anchorX="center"
            anchorY="middle"
          >
            {String(agentId.length > 12 ? `${agentId.slice(0, 12)}...` : agentId)}
          </Text>
          <Text
            position={[0, -0.08, 0.01]}
            fontSize={0.03}
            color="#aaaaaa"
            anchorX="center"
            anchorY="middle"
          >
            {String(`${agentEvents.length} events | ${agentStatus}`)}
          </Text>
        </group>
      )}
    </group>
  );
}