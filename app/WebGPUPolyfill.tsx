'use client';

// Polyfill WebGPU constants for browsers that don't support WebGPU (e.g. Firefox).
// three-render-objects imports 'three/webgpu' at the top level, which crashes
// when GPUShaderStage is undefined. These values match the WebGPU spec.
if (typeof window !== 'undefined' && !window.GPUShaderStage) {
  (window as any).GPUShaderStage = { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 };
}

export default function WebGPUPolyfill() {
  return null;
}
