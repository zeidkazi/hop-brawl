import { BackSide, Color, Mesh, ShaderMaterial, SphereGeometry } from 'three';
import { COLORS, VIEW } from '../../../shared/config';

/** Analytic sky gradient, with no bitmap or texture upload. */
export function createSky(desaturation = { value: 0 }): Mesh {
  const material = new ShaderMaterial({
    side: BackSide, depthWrite: false,
    uniforms: { top: { value: new Color(COLORS.skyTop) }, bottom: { value: new Color(COLORS.sky) }, desaturation },
    vertexShader: `varying vec3 direction;
      void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform float desaturation; varying vec3 direction;
      void main() { float t = smoothstep(-0.1, 0.6, normalize(direction).y);
        gl_FragColor = vec4(mix(bottom, top, t), 1.0);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722))), desaturation);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new Mesh(new SphereGeometry(VIEW.FAR / 2, 16, 8), material);
  sky.frustumCulled = false; sky.renderOrder = -1;
  return sky;
}
