import { Material, Mesh, Object3D, ShaderMaterial } from 'three';
/** Material-uniform game-over desaturation, without a post-processing pass. Installed during Loading. */
export function prepareDesaturation(root: Object3D, uniform: { value: number }, prepared: WeakSet<Material>): void {
  root.traverse(node => {
    if (!(node instanceof Mesh)) return;
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material instanceof ShaderMaterial || prepared.has(material)) continue;
      prepared.add(material);
      const before = material.onBeforeCompile.bind(material);
      const key = material.customProgramCacheKey.bind(material);
      material.onBeforeCompile = (shader, renderer) => {
        before(shader, renderer); shader.uniforms.uDesaturation = uniform;
        shader.fragmentShader = 'uniform float uDesaturation;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>',
          'outgoingLight = mix(outgoingLight, vec3(dot(outgoingLight, vec3(0.2126, 0.7152, 0.0722))), uDesaturation);\n#include <opaque_fragment>');
      };
      material.customProgramCacheKey = () => key() + '-desaturation';
    }
  });
}
