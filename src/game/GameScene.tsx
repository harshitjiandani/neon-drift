import { Component, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Entity = {
  id: string | number;
  lane: -1 | 0 | 1;
  z: number;
  kind: 'barrier' | 'block' | 'gap' | 'orb';
};

type SceneProps = {
  entities: Entity[];
  lane: -1 | 0 | 1;
  jumpHeight: number;
  sliding: boolean;
  running: boolean;
};

function TrackEnvironment({ running }: { running: boolean }) {
  const markers = useRef<THREE.Group>(null);
  const pulse = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (markers.current && running) {
      markers.current.position.z += delta * 13;
      if (markers.current.position.z > 9) markers.current.position.z = 0;
    }
    if (pulse.current) {
      pulse.current.rotation.y = state.clock.elapsedTime * 0.18;
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.025;
      pulse.current.scale.setScalar(scale);
    }
  });
  const markerPositions = useMemo(() => Array.from({ length: 24 }, (_, i) => -i * 5), []);
  return (
    <>
      <color attach="background" args={['#090b19']} />
      <fog attach="fog" args={['#090b19', 24, 82]} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 10, 5]} intensity={1.45} color="#b9faff" />
      <pointLight position={[-5, 3, -12]} intensity={35} color="#fa4baf" distance={32} />
      <pointLight position={[5, 4, -22]} intensity={40} color="#28e5df" distance={40} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, -37]}>
        <planeGeometry args={[7.2, 100]} />
        <meshStandardMaterial color="#11182b" metalness={0.7} roughness={0.42} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.255, -37]}>
        <planeGeometry args={[0.025, 100]} />
        <meshBasicMaterial color="#26394b" />
      </mesh>
      {[-1.17, 1.17].map((x) => (
        <group key={x} position={[x, -0.21, 0]}>
          <mesh position={[0, 0, -37]}>
            <boxGeometry args={[0.018, 0.012, 100]} />
            <meshBasicMaterial color="#68eddf" transparent opacity={0.42} />
          </mesh>
        </group>
      ))}
      <group ref={markers}>
        {markerPositions.map((z, i) => (
          <group key={i} position={[0, -0.245, z]}>
            {[-0.39, 0.39].map((x) => (
              <mesh key={x} position={[x, 0, 0]}>
                <boxGeometry args={[0.025, 0.012, 1.25]} />
                <meshBasicMaterial color="#78a2b5" transparent opacity={0.46} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
      {Array.from({ length: 15 }, (_, i) => (
        <group key={i} position={[i % 2 ? 4.6 : -4.6, 0, -7 - i * 5.5]}>
          <mesh position={[0, 2.8 + (i % 3) * 0.8, 0]}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshBasicMaterial color={i % 2 ? '#ff61b7' : '#4beadb'} />
          </mesh>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[0.055, 2.2, 0.055]} />
            <meshBasicMaterial color="#304057" />
          </mesh>
        </group>
      ))}
      <mesh ref={pulse} position={[0, 8, -57]}>
        <torusGeometry args={[5, 0.035, 5, 80]} />
        <meshBasicMaterial color="#e650a9" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 8, -57]}>
        <circleGeometry args={[4.9, 48]} />
        <meshBasicMaterial color="#17142a" />
      </mesh>
    </>
  );
}

function Runner({ lane, jumpHeight, sliding }: Pick<SceneProps, 'lane' | 'jumpHeight' | 'sliding'>) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (group.current) {
      group.current.position.x = THREE.MathUtils.damp(group.current.position.x, lane * 1.17, 11, delta);
      group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, -lane * 0.09, 8, delta);
    }
  });
  return (
    <group ref={group} position={[lane * 1.17, 0.2 + jumpHeight, 1.1]}>
      <mesh position={[0, 0.46, 0]} scale={sliding ? [0.48, 0.42, 0.8] : [0.38, 0.76, 0.4]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#20f4d0" metalness={0.52} roughness={0.22} emissive="#12a996" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, sliding ? 0.48 : 1.04, 0.02]}>
        <boxGeometry args={[0.36, 0.22, 0.34]} />
        <meshStandardMaterial color="#eefcff" emissive="#a5ffff" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.92, 0.035, 0.72]} />
        <meshBasicMaterial color="#37f6d7" transparent opacity={0.32} />
      </mesh>
      <pointLight position={[0, 0.8, 0.5]} color="#39ffda" intensity={4} distance={4} />
    </group>
  );
}

function TrackEntity({ entity }: { entity: Entity }) {
  const x = entity.lane * 1.17;
  const z = Math.max(-75, Math.min(4, entity.z));
  if (entity.kind === 'orb') {
    return (
      <group position={[x, 0.72, z]}>
        <mesh>
          <icosahedronGeometry args={[0.27, 1]} />
          <meshStandardMaterial color="#ffe178" emissive="#ffbd22" emissiveIntensity={1.7} metalness={0.3} roughness={0.18} />
        </mesh>
        <mesh>
          <torusGeometry args={[0.39, 0.025, 5, 24]} />
          <meshBasicMaterial color="#ffe178" />
        </mesh>
        <pointLight color="#ffc84a" intensity={2} distance={3} />
      </group>
    );
  }
  if (entity.kind === 'gap') {
    return (
      <group position={[x, -0.215, z]}>
        <mesh>
          <boxGeometry args={[1.05, 0.025, 2.6]} />
          <meshBasicMaterial color="#050814" />
        </mesh>
        <mesh position={[0, 0.025, 1.25]}>
          <boxGeometry args={[1.03, 0.035, 0.045]} />
          <meshBasicMaterial color="#f94eae" />
        </mesh>
      </group>
    );
  }
  const isBlock = entity.kind === 'block';
  return (
    <group position={[x, isBlock ? 0.52 : 0.85, z]}>
      <mesh castShadow>
        <boxGeometry args={isBlock ? [0.94, 1.04, 0.8] : [1.02, 0.3, 0.65]} />
        <meshStandardMaterial color={isBlock ? '#351d3b' : '#34213a'} metalness={0.55} roughness={0.3} emissive="#ed378b" emissiveIntensity={0.58} />
      </mesh>
      <mesh position={[0, isBlock ? 0 : 0, 0.34]}>
        <boxGeometry args={isBlock ? [0.72, 0.045, 0.025] : [0.82, 0.045, 0.025]} />
        <meshBasicMaterial color="#ff59af" />
      </mesh>
      {isBlock && <mesh position={[0, 0, 0.42]}><boxGeometry args={[0.7, 0.035, 0.025]} /><meshBasicMaterial color="#ff59af" /></mesh>}
    </group>
  );
}

function SceneContent(props: SceneProps) {
  return (
    <>
      <TrackEnvironment running={props.running} />
      <Runner lane={props.lane} jumpHeight={props.jumpHeight} sliding={props.sliding} />
      {props.entities.map((entity) => <TrackEntity key={entity.id} entity={entity} />)}
    </>
  );
}

class GameCanvas extends Component<SceneProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      const { entities, lane, jumpHeight, sliding } = this.props;
      return (
        <div className="game-scene-fallback" aria-hidden="true">
          <div className="fallback-horizon" />
          <div className="fallback-road">
            <span className="fallback-lane-line fallback-lane-line-left" />
            <span className="fallback-lane-line fallback-lane-line-right" />
            <span className="fallback-road-glow" />
          </div>
          {entities.map((entity) => {
            const progress = Math.max(0, Math.min(1, (entity.z + 54) / 58));
            return (
              <div
                key={entity.id}
                className={`fallback-entity fallback-entity-${entity.kind}`}
                style={{
                  left: `${50 + entity.lane * 20}%`,
                  top: `${29 + progress * 49}%`,
                  transform: `translate(-50%, -50%) scale(${0.3 + progress * 0.85})`,
                }}
              />
            );
          })}
          <div
            className={`fallback-runner${sliding ? " is-sliding" : ""}`}
            style={{
              left: `${50 + lane * 20}%`,
              bottom: `calc(19% + ${Math.min(1.9, jumpHeight) * 30}px)`,
            }}
          >
            <span className="fallback-runner-head" />
            <span className="fallback-runner-body" />
            <span className="fallback-runner-glow" />
          </div>
        </div>
      );
    }

    return (
      <Canvas
        className="game-canvas"
        camera={{ position: [0, 4.1, 9.4], fov: 52 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: false }}
      >
        <SceneContent {...this.props} />
      </Canvas>
    );
  }
}

export default function GameScene(props: SceneProps) {
  return <GameCanvas {...props} />;
}