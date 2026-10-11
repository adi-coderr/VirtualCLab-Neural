import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { MoleculeStructure } from "../../types/chemistry";
import { getElementVisual, getElementName } from "./elementColors";
import "./MoleculeViewer3D.css";

export type ViewMode = "ball-and-stick" | "space-filling" | "sticks";

interface HoveredAtomInfo {
  element: string;
  name: string;
  index: number;
  formalCharge?: number;
  screenX: number;
  screenY: number;
}

const BASE_BOND_RADIUS = 0.085;

function getAtomRadius(radiusPm: number, mode: ViewMode): number {
  if (mode === "space-filling") {
    // True proportional van der Waals representation
    return 0.45 + radiusPm * 0.007;
  }
  if (mode === "sticks") {
    return 0.16;
  }
  // Ball and Stick
  return 0.28 + radiusPm * 0.009;
}

export function MoleculeViewer3D({ structure }: { structure: MoleculeStructure }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("ball-and-stick");
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [hoveredAtom, setHoveredAtom] = useState<HoveredAtomInfo | null>(null);

  const resetCameraRef = useRef<() => void>(() => {});

  const handleResetCamera = useCallback(() => {
    resetCameraRef.current?.();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (err) {
      console.warn("WebGL not supported or unavailable:", err);
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:12px;">3D WebGL preview unavailable</div>';
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Studio 3-Point Lighting for rich molecular depth
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    const key = new THREE.DirectionalLight(0xfff8f0, 1.1);
    key.position.set(4, 5, 6);
    const fill = new THREE.DirectionalLight(0xddeeff, 0.55);
    fill.position.set(-5, -2, -4);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(0, 6, -5);
    scene.add(ambient, key, fill, rim);

    const group = new THREE.Group();
    scene.add(group);

    const atomMeshes: THREE.Mesh[] = [];
    const positions = structure.atoms.map((a) => new THREE.Vector3(a.x3d, a.y3d, a.z3d));

    let maxExtent = 1;
    for (const p of positions) maxExtent = Math.max(maxExtent, p.length());

    // 1. Render Atoms
    structure.atoms.forEach((atom, i) => {
      const visual = getElementVisual(atom.element);
      const radius = getAtomRadius(visual.radiusPm, viewMode);
      const geometry = new THREE.SphereGeometry(radius, 32, 24);
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(visual.color),
        roughness: 0.32,
        metalness: 0.12,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(positions[i]!);
      mesh.userData = { atomIndex: i, element: atom.element, formalCharge: atom.formalCharge };
      group.add(mesh);
      atomMeshes.push(mesh);
    });

    // 2. Render Bi-Color Covalent & Multi-bonds (Hidden in Space-Filling mode)
    if (viewMode !== "space-filling") {
      const bondRadius = viewMode === "sticks" ? 0.095 : BASE_BOND_RADIUS;

      for (const bond of structure.bonds) {
        const p1 = positions[bond.atomIndex1];
        const p2 = positions[bond.atomIndex2];
        if (!p1 || !p2) continue;

        const a1 = structure.atoms[bond.atomIndex1];
        const a2 = structure.atoms[bond.atomIndex2];
        const color1 = new THREE.Color(a1 ? getElementVisual(a1.element).color : "#7c8b93");
        const color2 = new THREE.Color(a2 ? getElementVisual(a2.element).color : "#7c8b93");

        if (bond.type === "ionic") {
          const material = new THREE.LineDashedMaterial({
            color: 0x8fa3af,
            dashSize: 0.14,
            gapSize: 0.09,
          });
          const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
          const line = new THREE.Line(geometry, material);
          line.computeLineDistances();
          group.add(line);
          continue;
        }

        const direction = new THREE.Vector3().subVectors(p2, p1);
        const fullLength = direction.length();
        const halfLength = fullLength * 0.5;
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const orientation = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize()
        );

        const perpendicular = new THREE.Vector3(1, 0, 0).cross(direction).normalize();
        const perpVector = perpendicular.lengthSq() > 0 ? perpendicular : new THREE.Vector3(0, 0, 1);
        const offsets = bond.order === 1 ? [0] : bond.order === 2 ? [-0.08, 0.08] : [-0.14, 0, 0.14];

        for (const offset of offsets) {
          // Half 1: Atom 1 to Midpoint
          const pos1 = new THREE.Vector3().addVectors(p1, mid).multiplyScalar(0.5);
          const geom1 = new THREE.CylinderGeometry(bondRadius, bondRadius, halfLength, 16);
          const mat1 = new THREE.MeshStandardMaterial({ color: color1, roughness: 0.38, metalness: 0.08 });
          const mesh1 = new THREE.Mesh(geom1, mat1);
          mesh1.position.copy(pos1).addScaledVector(perpVector, offset);
          mesh1.quaternion.copy(orientation);
          group.add(mesh1);

          // Half 2: Midpoint to Atom 2
          const pos2 = new THREE.Vector3().addVectors(mid, p2).multiplyScalar(0.5);
          const geom2 = new THREE.CylinderGeometry(bondRadius, bondRadius, halfLength, 16);
          const mat2 = new THREE.MeshStandardMaterial({ color: color2, roughness: 0.38, metalness: 0.08 });
          const mesh2 = new THREE.Mesh(geom2, mat2);
          mesh2.position.copy(pos2).addScaledVector(perpVector, offset);
          mesh2.quaternion.copy(orientation);
          group.add(mesh2);
        }
      }
    }

    // Camera Placement & OrbitControls
    const initialDistance = Math.max(3.2, maxExtent * 2.85);
    camera.position.set(0, 0, initialDistance);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1;
    controls.maxDistance = 24;

    resetCameraRef.current = () => {
      camera.position.set(0, 0, initialDistance);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    };

    // Raycasting for Atom Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atomMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0]!.object;
        const data = hit.userData;
        setHoveredAtom({
          element: data.element,
          name: getElementName(data.element),
          index: data.atomIndex + 1,
          formalCharge: data.formalCharge,
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top,
        });
      } else {
        setHoveredAtom(null);
      }
    };

    const handlePointerLeave = () => {
      setHoveredAtom(null);
    };

    const domElement = renderer.domElement;
    domElement.addEventListener("mousemove", handlePointerMove);
    domElement.addEventListener("mouseleave", handlePointerLeave);

    // Animation Loop
    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (isRotating) {
        group.rotation.y += 0.007;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      if (clientWidth === 0 || clientHeight === 0) return;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      domElement.removeEventListener("mousemove", handlePointerMove);
      domElement.removeEventListener("mouseleave", handlePointerLeave);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          const material = obj.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [structure, viewMode, isRotating]);

  return (
    <div className="molecule-3d-wrapper">
      <div
        ref={containerRef}
        className="molecule-3d"
        aria-label="Interactive 3D molecular structure (drag to rotate, scroll to zoom)"
      />

      {/* Interactive Controls Overlay */}
      <div className="molecule-3d__controls">
        <div className="molecule-3d__modes">
          <button
            type="button"
            className={`molecule-3d__btn ${viewMode === "ball-and-stick" ? "is-active" : ""}`}
            onClick={() => setViewMode("ball-and-stick")}
            title="Ball & Stick Representation"
          >
            Ball & Stick
          </button>
          <button
            type="button"
            className={`molecule-3d__btn ${viewMode === "space-filling" ? "is-active" : ""}`}
            onClick={() => setViewMode("space-filling")}
            title="Space-Filling (van der Waals Electron Cloud)"
          >
            Space-Filling
          </button>
          <button
            type="button"
            className={`molecule-3d__btn ${viewMode === "sticks" ? "is-active" : ""}`}
            onClick={() => setViewMode("sticks")}
            title="Stick Bond Wireframe"
          >
            Sticks
          </button>
        </div>

        <div className="molecule-3d__actions">
          <button
            type="button"
            className={`molecule-3d__action-btn ${isRotating ? "is-active" : ""}`}
            onClick={() => setIsRotating((r) => !r)}
            title={isRotating ? "Pause 3D rotation" : "Enable continuous 3D rotation"}
          >
            {isRotating ? "⏸ Pause Spin" : "▶ Rotate"}
          </button>
          <button
            type="button"
            className="molecule-3d__action-btn"
            onClick={handleResetCamera}
            title="Recenter camera on molecule"
          >
            ↺ Recenter
          </button>
        </div>
      </div>

      {/* Hover Atom Tooltip */}
      {hoveredAtom && (
        <div
          className="molecule-3d__tooltip"
          style={{
            left: `${hoveredAtom.screenX + 12}px`,
            top: `${hoveredAtom.screenY - 24}px`,
          }}
        >
          <span className="molecule-3d__tooltip-name">{hoveredAtom.name}</span>
          <span className="molecule-3d__tooltip-sym">({hoveredAtom.element})</span>
          <span className="molecule-3d__tooltip-idx">#{hoveredAtom.index}</span>
          {hoveredAtom.formalCharge !== undefined && hoveredAtom.formalCharge !== 0 && (
            <span className="molecule-3d__tooltip-charge">
              Charge: {hoveredAtom.formalCharge > 0 ? `+${hoveredAtom.formalCharge}` : hoveredAtom.formalCharge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
