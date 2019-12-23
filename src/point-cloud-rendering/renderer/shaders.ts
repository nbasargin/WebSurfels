/**
 * Some GLSL shaders here.
 */

export const vertexShader = `
    attribute vec3 pos;
    attribute vec3 color;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying vec3 v_color;
    
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1); 
      // mix(from, to, progress)
      gl_PointSize = 2.0;
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
