import * as THREE from 'three';

export type LightBeamData = {
  lat: number;
  lng: number;
  programCount?: number;
  _index: number;
};

type PulsingBeam = {
  beam: THREE.Mesh;
  glow: THREE.Mesh;
  baseSphere: THREE.Mesh;
  group: THREE.Group;
  baseOpacity: number;
  glowBaseOpacity: number;
  baseSphereBaseOpacity: number;
  opacityPhase: number;
  heightPhase: number;
  heightSpeed: number;
  isHovered: boolean;
};

const pulsingBeams: Array<PulsingBeam> = [];
const beamsByIndex = new Map<number, PulsingBeam>();
let animationStarted = false;

const animatePulse = () => {
  const time = Date.now() * 0.001;
  for (const item of pulsingBeams) {
    const opacityPulse = 0.85 + 0.15 * Math.sin(time * 1.5 + item.opacityPhase);
    const heightPulse = 0.85 + 0.25 * Math.sin(time * item.heightSpeed + item.heightPhase);
    const hoverBoost = item.isHovered ? 4.0 : 1.0;
    const beamMat = item.beam.material as THREE.ShaderMaterial;
    const glowMat = item.glow.material as THREE.ShaderMaterial;
    const baseSphereMat = item.baseSphere.material as THREE.ShaderMaterial;
    if (beamMat.uniforms) beamMat.uniforms.opacity.value = item.baseOpacity * opacityPulse * hoverBoost;
    if (glowMat.uniforms) glowMat.uniforms.opacity.value = item.glowBaseOpacity * opacityPulse * hoverBoost * 3;
    if (baseSphereMat.uniforms) baseSphereMat.uniforms.opacity.value = item.baseSphereBaseOpacity * opacityPulse * hoverBoost;
    item.group.scale.z = heightPulse;
  }
  requestAnimationFrame(animatePulse);
};

export const setBeamHovered = (index: number, hovered: boolean) => {
  const beam = beamsByIndex.get(index);
  if (beam) beam.isHovered = hovered;
};

export const createLightBeams = (obj: object): THREE.Object3D => {
  const d = obj as LightBeamData;
  const programCount = d.programCount || 1;
  const group = new THREE.Group();
  const baseHeight = 8;
  const baseWidth = 0.2;
  const heightScale = 2 + Math.log2(programCount + 2) * 0.8;
  const widthScale = 1 + Math.log2(programCount + 1) * 0.3;
  const beamHeight = baseHeight * heightScale;
  const beamWidth = baseWidth * widthScale;
  const beamColor = new THREE.Color(1.0, 0.95, 0.85);
  const segments = 16;
  const beamGeometry = new THREE.CylinderGeometry(beamWidth * 3, beamWidth, beamHeight, 8, segments, true);
  const alphas = new Float32Array(beamGeometry.attributes.position.count);
  const positions = beamGeometry.attributes.position.array;
  for (let v = 0; v < beamGeometry.attributes.position.count; v++) {
    const y = positions[v * 3 + 1];
    const t = (y + beamHeight / 2) / beamHeight;
    const alpha = Math.pow(Math.max(0, 1 - t * 1.1), 2.2);
    alphas[v] = alpha < 0.01 ? 0 : alpha;
  }
  beamGeometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  beamGeometry.rotateX(Math.PI / 2);
  beamGeometry.translate(0, 0, beamHeight / 2);
  const beamMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: beamColor },
      opacity: { value: 0.85 },
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(color, vAlpha * opacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeometry, beamMaterial);
  group.add(beam);
  const glowGeometry = new THREE.CylinderGeometry(beamWidth * 6, beamWidth * 2, beamHeight * 0.95, 8, segments, true);
  const glowAlphas = new Float32Array(glowGeometry.attributes.position.count);
  const glowPositions = glowGeometry.attributes.position.array;
  const glowHeight = beamHeight * 0.95;
  for (let v = 0; v < glowGeometry.attributes.position.count; v++) {
    const y = glowPositions[v * 3 + 1];
    const t = (y + glowHeight / 2) / glowHeight;
    const alpha = Math.pow(Math.max(0, 1 - t * 1.1), 2.2);
    glowAlphas[v] = alpha < 0.01 ? 0 : alpha;
  }
  glowGeometry.setAttribute('alpha', new THREE.BufferAttribute(glowAlphas, 1));
  glowGeometry.rotateX(Math.PI / 2);
  glowGeometry.translate(0, 0, beamHeight / 2);
  const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: beamColor },
      opacity: { value: 0.15 },
    },
    vertexShader: `
      attribute float alpha;
      varying float vAlpha;
      void main() {
        vAlpha = alpha;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(color, vAlpha * opacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  group.add(glow);
  const baseSphereGeometry = new THREE.SphereGeometry(beamWidth * 2, segments, segments);
  const baseSphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: beamColor },
      opacity: { value: 0.6 },
    },
    vertexShader: `
      void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float opacity;
      void main() {
        gl_FragColor = vec4(color, opacity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
  const baseSphere = new THREE.Mesh(baseSphereGeometry, baseSphereMaterial);
  group.add(baseSphere);
  const hoverTargetGeometry = new THREE.CylinderGeometry(beamWidth * 12, beamWidth * 4, beamHeight, 8, segments, true);
  hoverTargetGeometry.rotateX(Math.PI / 2);
  hoverTargetGeometry.translate(0, 0, beamHeight / 2);
  const hoverTargetMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    visible: false,
  });
  const hoverTarget = new THREE.Mesh(hoverTargetGeometry, hoverTargetMaterial);
  group.add(hoverTarget);
  const pulsingBeam: PulsingBeam = {
    beam,
    glow,
    baseSphere,
    group,
    baseOpacity: 0.85,
    glowBaseOpacity: 0.15,
    baseSphereBaseOpacity: 0.6,
    opacityPhase: Math.random() * Math.PI * 2,
    heightPhase: Math.random() * Math.PI * 4,
    heightSpeed: 0.2 + Math.random() * 1.5,
    isHovered: false,
  };
  pulsingBeams.push(pulsingBeam);
  beamsByIndex.set(d._index, pulsingBeam);
  if (!animationStarted) {
    animationStarted = true;
    animatePulse();
  }
  (group as THREE.Object3D & { __markerIndex?: number }).__markerIndex = d._index;
  (group as THREE.Object3D & { __data?: LightBeamData }).__data = d;
  return group;
};