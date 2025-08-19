'use client';

import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Event3D } from '@/hooks/useEventStream3D';
import { WorkflowFork } from './WorkflowFork';
import { EventFork } from './EventFork';
import { HeartbeatNode } from './HeartbeatNode';


interface FlowingParticlesProps {
  riverPath: THREE.Vector3[];
  eventCount: number;
}

function FlowingParticles({ riverPath, eventCount }: FlowingParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = Math.max(50, eventCount * 5);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      // Start particles at random positions along the river
      const pathProgress = Math.random();
      const pathIndex = Math.floor(pathProgress * (riverPath.length - 1));
      const nextPathIndex = Math.min(pathIndex + 1, riverPath.length - 1);
      const localProgress = pathProgress * (riverPath.length - 1) - pathIndex;
      
      const currentPoint = riverPath[pathIndex];
      const nextPoint = riverPath[nextPathIndex];
      
      if (currentPoint && nextPoint) {
        positions[idx] = THREE.MathUtils.lerp(currentPoint.x, nextPoint.x, localProgress);
        positions[idx + 1] = THREE.MathUtils.lerp(currentPoint.y, nextPoint.y, localProgress);
        positions[idx + 2] = THREE.MathUtils.lerp(currentPoint.z, nextPoint.z, localProgress);
      }
      
      velocities[idx] = 0;
      velocities[idx + 1] = -0.02; // Flow downward
      velocities[idx + 2] = 0;
    }
    
    return { positions, velocities };
  }, [riverPath, particleCount]);
  
  useFrame(() => {
    if (!pointsRef.current) return;
    
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      
      // Move particle down
      positions[idx + 1] += particles.velocities[idx + 1];
      
      // Reset particle if it goes too far down
      if (positions[idx + 1] < -10) {
        positions[idx + 1] = 10;
        // Add some randomness to x position for natural flow
        positions[idx] = (Math.random() - 0.5) * 0.6;
      }
    }
    
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00ffff"
        transparent
        opacity={0.8}
        sizeAttenuation={false}
      />
    </points>
  );
}

interface RiverLineProps {
  segments?: number;
  amplitude?: number;
  frequency?: number;
}

function RiverLine({ segments = 200, amplitude = 0.3, frequency = 0.02 }: RiverLineProps) {
  const riverRef = useRef<THREE.Line>(null);
  const glowRef = useRef<THREE.Line>(null);
  
  const riverPath = useMemo(() => {
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const y = (i / segments) * 20 - 10;
      const wave = Math.sin(i * frequency) * amplitude;
      const x = wave;
      points.push(new THREE.Vector3(x, y, 0));
    }
    return points;
  }, [segments, amplitude, frequency]);
  
  const riverGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(riverPath);
  }, [riverPath]);
  
  // Animate the river flow
  useFrame((state) => {
    if (riverRef.current) {
      const material = riverRef.current.material as THREE.LineBasicMaterial;
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.2 + 0.8;
      material.opacity = pulse;
    }
    
    if (glowRef.current) {
      const material = glowRef.current.material as THREE.LineBasicMaterial;
      const glow = Math.sin(state.clock.elapsedTime * 1.5 + Math.PI/4) * 0.3 + 0.4;
      material.opacity = glow;
    }
  });
  
  return (
    <group>
      {/* Outer glow effect */}
      <line>
        <primitive object={riverGeometry} />
        <lineBasicMaterial
          color="#0088aa"
          transparent
          opacity={0.3}
        />
      </line>
      
      {/* Main river line */}
      <line>
        <primitive object={riverGeometry} />
        <lineBasicMaterial
          color="#00ffdd"
          transparent
          opacity={0.9}
        />
      </line>
      
      {/* Flowing particles */}
      <FlowingParticles riverPath={riverPath} eventCount={0} />
    </group>
  );
}


interface EventRiverProps {
  events?: Event3D[];
  lastHeartbeat?: Date | null;
  onWorkflowClick?: (workflowId: string) => void;
  onAgentClick?: (agentId: string) => void;
  cameraDistance?: number;
}

/**
 * Main EventRiver 3D component - a vertical flowing river that visualizes events
 */
export function EventRiver({ 
  events = [], 
  lastHeartbeat,
  onWorkflowClick, 
  onAgentClick 
}: EventRiverProps) {
  // Extract workflows from events
  const workflows = useMemo(() => {
    const workflowMap = new Map();
    
    // Process all events and extract workflows
    events.forEach(event => {
      
      let workflowId = null;
      
      // Check if this is a direct workflow event
      if (event.aggregate?.toLowerCase().includes('workflow')) {
        workflowId = event.id || event.attributes?.workflow_id || event.attributes?.WORKFLOW_ID;
      }
      
      // Check if this is an agent event with a workflow_id
      if (event.aggregate?.toLowerCase().includes('agent')) {
        workflowId = event.attributes?.workflow_id || event.attributes?.WORKFLOW_ID;
      }
      
      // Create workflow if we found an ID and it's not already tracked
      if (workflowId && !workflowMap.has(workflowId)) {
        // Position workflows along the river path at regular intervals
        const workflowIndex = workflowMap.size;
        const yPosition = workflowIndex * -2; // Space workflows 2 units apart vertically
        // Calculate river X position at this Y coordinate
        const riverX = Math.sin(yPosition * 0.02) * 0.3; // Match river wave calculation
        
        const newWorkflow = {
          id: workflowId,
          position: event.riverPosition ? 
            new THREE.Vector3(event.riverPosition.x, event.riverPosition.y, event.riverPosition.z) :
            new THREE.Vector3(riverX, yPosition, 0), // Position on the river line
          isActive: event.eventName?.includes('started') || event.eventName?.includes('active')
        };
        
        workflowMap.set(workflowId, newWorkflow);
      }
    });
      
    const workflowArray = Array.from(workflowMap.values());
    return workflowArray;
  }, [events]);

  // Extract agents grouped by workflow
  const agentsByWorkflow = useMemo(() => {
    const agentMap = new Map<string, Map<string, Event3D>>();
    
    events
      .filter(e => e.aggregate?.toLowerCase().includes('agent'))
      .forEach(event => {
        const workflowId = String(event.attributes?.workflow_id || event.attributes?.WORKFLOW_ID || 'orphaned');
        const agentId = String(event.attributes?.agent_id || event.attributes?.AGENT_ID || event.id);
        
        
        if (!agentMap.has(workflowId)) {
          agentMap.set(workflowId, new Map());
        }
        
        const workflowMap = agentMap.get(workflowId);
        if (workflowMap && !workflowMap.has(agentId)) {
          workflowMap.set(agentId, event);
        }
      });
    
    return agentMap;
  }, [events]);
  
  return (
    <group>
      {/* Main river */}
      <RiverLine />
      
      {/* Workflow forks */}
      {workflows.map((workflow) => (
        <group key={workflow.id}>
          <WorkflowFork
            workflowId={workflow.id}
            events={events}
            position={workflow.position}
            onClick={onWorkflowClick}
          />
          
          {/* Agent forks for this workflow */}
          {agentsByWorkflow.get(workflow.id) && 
            Array.from(agentsByWorkflow.get(workflow.id)!.keys()).map((agentId, index) => (
              <EventFork
                key={agentId}
                agentId={agentId}
                events={events}
                workflowForkPosition={workflow.position}
                index={index}
                onClick={onAgentClick}
              />
            ))
          }
        </group>
      ))}
    </group>
  );
}

/**
 * Digital environment effects component
 */
function DigitalEnvironment() {
  const particlesRef = useRef<THREE.Points>(null);
  
  // Create background particle field
  const backgroundParticles = useMemo(() => {
    const count = 200;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    
    return positions;
  }, []);
  
  // Animate background particles
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0005;
      
      // Pulse effect
      const pulse = Math.sin(state.clock.elapsedTime * 0.5) * 0.3 + 0.7;
      const material = particlesRef.current.material as THREE.PointsMaterial;
      material.opacity = pulse * 0.3;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[backgroundParticles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#004466"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
}

/**
 * Dynamic lighting system for digital aesthetic
 */
function DynamicLighting({ events }: { events: Event3D[] }) {
  const mainLightRef = useRef<THREE.DirectionalLight>(null);
  const accentLight1Ref = useRef<THREE.PointLight>(null);
  const accentLight2Ref = useRef<THREE.PointLight>(null);
  
  // Animate lighting based on event activity
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const eventActivity = Math.min(events.length / 10, 1); // Normalize activity
    
    // Main directional light follows river flow
    if (mainLightRef.current) {
      mainLightRef.current.position.x = Math.sin(time * 0.2) * 2;
      mainLightRef.current.intensity = 0.8 + eventActivity * 0.4;
    }
    
    // Accent lights pulse with activity
    if (accentLight1Ref.current) {
      const pulse1 = Math.sin(time * 2) * 0.3 + 0.7;
      accentLight1Ref.current.intensity = pulse1 * (0.5 + eventActivity * 0.5);
      accentLight1Ref.current.position.y = Math.cos(time * 0.5) * 3;
    }
    
    if (accentLight2Ref.current) {
      const pulse2 = Math.cos(time * 1.7) * 0.3 + 0.7;
      accentLight2Ref.current.intensity = pulse2 * (0.3 + eventActivity * 0.4);
      accentLight2Ref.current.position.y = Math.sin(time * 0.7) * -2;
    }
  });
  
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.15} color="#001122" />
      
      {/* Main directional light */}
      <directionalLight
        ref={mainLightRef}
        position={[5, 5, 10]}
        intensity={0.8}
        color="#00ccff"
        castShadow
      />
      
      {/* Accent lights */}
      <pointLight
        ref={accentLight1Ref}
        position={[8, 0, 5]}
        intensity={0.6}
        color="#00ffaa"
        distance={15}
        decay={2}
      />
      
      <pointLight
        ref={accentLight2Ref}
        position={[-8, 0, 5]}
        intensity={0.4}
        color="#ff0088"
        distance={12}
        decay={2}
      />
      
      {/* Rim lighting */}
      <pointLight
        position={[0, -10, -5]}
        intensity={0.3}
        color="#0066cc"
        distance={20}
        decay={1.5}
      />
    </>
  );
}

/**
 * EventRiverScene - Full 3D scene wrapper with camera and enhanced lighting
 */
export function EventRiverScene({ 
  events = [], 
  lastHeartbeat,
  onWorkflowClick, 
  onAgentClick,
  cameraDistance = 6
}: EventRiverProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-black via-gray-900 to-black">
      <Canvas
        camera={{
          position: [0, 0, cameraDistance],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        shadows="soft"
        gl={{ 
          antialias: true, 
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        {/* Enhanced lighting system */}
        <DynamicLighting events={events} />
        
        {/* Digital environment effects */}
        <DigitalEnvironment />
        
        {/* Fog for depth */}
        <fog attach="fog" args={['#000011', 15, 50]} />
        
        {/* Event River */}
        <EventRiver 
          events={events}
          lastHeartbeat={lastHeartbeat}
          onWorkflowClick={onWorkflowClick}
          onAgentClick={onAgentClick}
        />
        
        {/* Heartbeat indicator */}
        <HeartbeatNode lastHeartbeat={lastHeartbeat} position={[0, 6, 0]} />
      </Canvas>
    </div>
  );
}