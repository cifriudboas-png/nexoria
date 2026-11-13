import { useMemo, useRef, useState, type MutableRefObject, type Ref } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges, Environment, Grid, Lightformer, OrbitControls, Sky, TransformControls } from '@react-three/drei';
import type { Mesh } from 'three';
import { createSimulation, stepSimulation, type Part, type PartShape, type Vec3 } from '@/builder/world';

export type BuilderTool = 'select' | 'move' | 'scale' | 'rotate';

type BuilderSceneProps = {
  parts: Part[];
  selectedId: string | null;
  tool: BuilderTool;
  isPlaying: boolean;
  onSelect: (id: string | null) => void;
  onTransform: (id: string, change: Pick<Part, 'position' | 'size' | 'rotation'>) => void;
  onReady: () => void;
};

const toRadians = (r: Vec3): Vec3 => r.map((d) => (d * Math.PI) / 180) as Vec3;
const toDegrees = (r: { x: number; y: number; z: number }): Vec3 =>
  [r.x, r.y, r.z].map((v) => (v * 180) / Math.PI) as Vec3;

function PartGeometry({ shape }: { shape: PartShape }) {
  if (shape === 'sphere') return <sphereGeometry args={[0.5, 32, 20]} />;
  if (shape === 'cylinder') return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
  return <boxGeometry args={[1, 1, 1]} />;
}

type PartMeshProps = {
  part: Part;
  isSelected?: boolean;
  meshRef?: Ref<Mesh> | undefined;
  onClick?: ((event: ThreeEvent<MouseEvent>) => void) | undefined;
};

function PartMesh({ part, isSelected = false, meshRef, onClick }: PartMeshProps) {
  const opacity = 1 - part.transparency;
  return (
    <mesh
      ref={meshRef}
      position={part.position}
      rotation={toRadians(part.rotation)}
      scale={part.size}
      castShadow={opacity > 0.05}
      receiveShadow
      {...(onClick ? { onClick } : {})}
    >
      <PartGeometry shape={part.shape} />
      <meshStandardMaterial
        color={part.color}
        roughness={0.75}
        metalness={0.05}
        transparent={part.transparency > 0}
        opacity={opacity}
        depthWrite={part.transparency < 0.5}
      />
      {isSelected && <Edges color="#38bdf8" threshold={20} />}
    </mesh>
  );
}

/** Edição: clicar seleciona, e a ferramenta ativa move/aumenta/gira o objeto. */
function EditableParts({
  parts,
  selectedId,
  tool,
  onSelect,
  onTransform,
  gizmoBusy,
}: Omit<BuilderSceneProps, 'isPlaying' | 'onReady'> & { gizmoBusy: MutableRefObject<boolean> }) {
  const [selectedMesh, setSelectedMesh] = useState<Mesh | null>(null);

  const commit = () => {
    if (!selectedMesh || !selectedId) return;
    const { position, scale, rotation } = selectedMesh;
    onTransform(selectedId, {
      position: [position.x, position.y, position.z],
      size: [scale.x, scale.y, scale.z],
      rotation: toDegrees(rotation),
    });
  };

  return (
    <>
      {parts.map((part) => (
        <PartMesh
          key={part.id}
          part={part}
          isSelected={part.id === selectedId}
          meshRef={part.id === selectedId ? setSelectedMesh : undefined}
          onClick={(event) => {
            if (event.delta > 4 || gizmoBusy.current) return;
            event.stopPropagation();
            onSelect(part.id);
          }}
        />
      ))}
      {selectedMesh && selectedId && tool !== 'select' && (
        <TransformControls
          object={selectedMesh}
          mode={tool === 'move' ? 'translate' : tool}
          translationSnap={0.5}
          rotationSnap={Math.PI / 12}
          scaleSnap={0.25}
          size={0.9}
          onMouseDown={() => {
            gizmoBusy.current = true;
          }}
          onMouseUp={() => {
            commit();
            // O clique que termina o arrasto não pode desmarcar o objeto.
            window.setTimeout(() => {
              gizmoBusy.current = false;
            }, 120);
          }}
        />
      )}
    </>
  );
}

/** Teste: os objetos soltos caem; nada é salvo enquanto testa. */
function PlayingParts({ parts }: { parts: Part[] }) {
  const sim = useMemo(() => createSimulation(parts), [parts]);
  const meshes = useRef(new Map<string, Mesh>());

  useFrame((_, delta) => {
    stepSimulation(sim, Math.min(delta, 0.05));
    for (const part of sim) {
      const mesh = meshes.current.get(part.id);
      if (!mesh) continue;
      mesh.position.set(part.position[0], part.position[1], part.position[2]);
      mesh.visible = !part.removed;
    }
  });

  return (
    <>
      {sim.map((part) => (
        <PartMesh
          key={part.id}
          part={part}
          meshRef={(mesh: Mesh | null) => {
            if (mesh) meshes.current.set(part.id, mesh);
            else meshes.current.delete(part.id);
          }}
        />
      ))}
    </>
  );
}

export default function BuilderScene({ parts, selectedId, tool, isPlaying, onSelect, onTransform, onReady }: BuilderSceneProps) {
  const gizmoBusy = useRef(false);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [26, 20, 26], fov: 50, near: 0.1, far: 2000 }}
      onCreated={onReady}
      onPointerMissed={() => {
        if (!gizmoBusy.current && !isPlaying) onSelect(null);
      }}
    >
      <color attach="background" args={['#a9d8f5']} />
      <Sky sunPosition={[80, 50, 60]} turbidity={4} rayleigh={1.2} />
      <hemisphereLight args={['#e0f2fe', '#57534e', 0.6]} />
      <directionalLight
        position={[30, 45, 20]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-far={150}
        shadow-bias={-0.0004}
      />
      <Environment resolution={64}>
        <Lightformer intensity={1.6} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer intensity={0.8} color="#bae6fd" position={[-6, 2, -2]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>

      {isPlaying ? (
        <PlayingParts parts={parts} />
      ) : (
        <EditableParts
          parts={parts}
          selectedId={selectedId}
          tool={tool}
          onSelect={onSelect}
          onTransform={onTransform}
          gizmoBusy={gizmoBusy}
        />
      )}

      <Grid
        position={[0, 0.01, 0]}
        args={[64, 64]}
        cellSize={2}
        cellThickness={0.6}
        cellColor="#6b7280"
        sectionSize={8}
        sectionThickness={1}
        sectionColor="#4b5563"
        fadeDistance={120}
        fadeStrength={1.5}
        followCamera={false}
      />

      <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.49} minDistance={3} maxDistance={250} enableDamping />
    </Canvas>
  );
}
