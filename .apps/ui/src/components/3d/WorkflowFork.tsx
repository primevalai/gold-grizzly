'use client';

import { useRef, useMemo, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { Event3D } from '@/hooks/useEventStream3D';

interface WorkflowForkProps {
  workflowId: string;
  events: Event3D[];
  position: THREE.Vector3;
  onClick?: (workflowId: string) => void;
}

/**
 * WorkflowFork component - creates a branch from the main river for workflow events
 */
export function WorkflowFork({ 
  workflowId, 
  events, 
  position, 
  onClick 
}: WorkflowForkProps) {
  const forkRef = useRef<THREE.Group>(null);
  const [showLabel, setShowLabel] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Get workflow events
  const workflowEvents = useMemo(() => {
    return events.filter(e => 
      e.aggregate.toLowerCase() === 'workflow' && 
      (e.attributes?.WORKFLOW_ID === workflowId || e.id === workflowId)
    );
  }, [events, workflowId]);
  
  // Get agent events belonging to this workflow
  const agentEvents = useMemo(() => {
    return events.filter(e => 
      e.aggregate.toLowerCase() === 'agent' && 
      e.attributes?.WORKFLOW_ID === workflowId
    );
  }, [events, workflowId]);
  
  // Determine workflow status
  const workflowStatus = useMemo(() => {
    if (workflowEvents.some(e => e.eventName.includes('failed'))) return 'failed';
    if (workflowEvents.some(e => e.eventName.includes('completed'))) return 'completed';
    if (workflowEvents.some(e => e.eventName.includes('started'))) return 'active';
    return 'idle';
  }, [workflowEvents]);
  
  // Create fork path - curves away from main river
  const forkPath = useMemo(() => {
    const points = [];
    
    // Start from the river position (which should be on the river line)
    const startX = 0; // Start from relative position 0,0,0 since we're positioned at the river
    const startY = 0;
    
    // Create a curved branch extending from the main river to the right
    for (let i = 0; i <= 20; i++) {
      const progress = i / 20;
      // Smooth curve extending to the right
      const curve = Math.sin(progress * Math.PI * 0.5);
      const x = curve * 1.8; // Extend to the right
      const y = -progress * 0.8; // Slight downward flow
      const z = Math.sin(progress * Math.PI) * 0.05; // Minimal 3D curve
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, []);
  
  const forkGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(forkPath);
  }, [forkPath]);
  
  // Color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#00ff00';
      case 'completed': return '#0088ff';
      case 'failed': return '#ff4444';
      default: return '#666666';
    }
  };
  
  const statusColor = getStatusColor(workflowStatus);
  const endPosition = forkPath[forkPath.length - 1];
  // endPosition is already relative since forkPath starts from 0,0,0
  const relativeEndPos = endPosition;
  
  // Animation for flowing particles along the fork
  useFrame((state) => {
    if (forkRef.current && workflowStatus === 'active') {
      // Subtle pulsing animation for active workflows
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.05 + 1;
      forkRef.current.scale.setScalar(pulse);
    }
  });
  
  const handleClick = () => {
    setShowLabel(!showLabel);
    onClick?.(workflowId);
  };
  
  return (
    <group ref={forkRef} position={position}>
      {/* Fork branch line */}
      <line>
        <primitive object={forkGeometry} />
        <lineBasicMaterial
          color={statusColor}
          transparent
          opacity={workflowStatus === 'idle' ? 0.4 : 0.8}
        />
      </line>
      
      {/* Flowing particles along fork for active workflows */}
      {workflowStatus === 'active' && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(
                Array.from({ length: 30 }, (_, i) => {
                  const pointIndex = Math.floor((i / 3) % forkPath.length);
                  const point = forkPath[pointIndex];
                  if (!point) return 0;
                  return i % 3 === 0 ? point.x : 
                         i % 3 === 1 ? point.y : point.z;
                })
              ), 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.03}
            color={statusColor}
            transparent
            opacity={0.6}
          />
        </points>
      )}
      
      {/* Workflow node at end of branch */}
      <mesh
        position={relativeEndPos}
        onClick={handleClick}
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
        scale={isHovered ? 1.2 : 1}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color={statusColor}
          transparent
          opacity={0.8}
          emissive={statusColor}
          emissiveIntensity={workflowStatus === 'active' ? 0.3 : 0.1}
        />
      </mesh>
      
      {/* Event count indicator */}
      <mesh position={[relativeEndPos.x, relativeEndPos.y + 0.15, relativeEndPos.z]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Workflow ID label */}
      {showLabel && (
        <group position={[relativeEndPos.x, relativeEndPos.y + 0.3, relativeEndPos.z]}>
          <mesh>
            <planeGeometry args={[1.5, 0.3]} />
            <meshBasicMaterial 
              color="#000000" 
              transparent 
              opacity={0.8} 
            />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.08}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            {String(workflowId.length > 8 ? `${workflowId.slice(0, 8)}...` : workflowId)}
          </Text>
          <Text
            position={[0, -0.08, 0.01]}
            fontSize={0.05}
            color="#cccccc"
            anchorX="center"
            anchorY="middle"
          >
            {String(`${workflowEvents.length} events | ${agentEvents.length} agents`)}
          </Text>
        </group>
      )}
    </group>
  );
}