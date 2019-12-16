/**
 * Some GLSL shaders here.
 */

export const vertexShader = `
    attribute vec3 from;
    attribute vec3 to;
    attribute vec3 color;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float progress;
    
    varying vec3 v_color;
    
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(mix(from, to, progress), 1); 
      gl_PointSize = 1.0;
      v_color = color;
    }
`;


export const fragmentShader = `
    precision highp float;

    varying vec3 v_color;

    void main() {
      gl_FragColor = vec4(v_color, 1.0);
    }
`;
