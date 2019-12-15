/**
 * Some GLSL shaders here.
 */

export const vertexShader = `
    attribute vec3 from;
    attribute vec3 to;
    
    // uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float progress;
    
    void main() {
      gl_Position = uProjectionMatrix * vec4(mix(from, to, progress), 1); 
      // gl_Position = from * (1.0 - progress) + to * progress; 
      // uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      gl_PointSize = 1.0;
    }
`;


export const fragmentShader = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
`;
