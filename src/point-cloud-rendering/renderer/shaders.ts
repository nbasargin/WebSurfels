/**
 * Some GLSL shaders here.
 */

export const vertexShader = `
    attribute vec3 pos;
    attribute vec3 color;
    attribute vec3 normal; 
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying vec3 v_color;
    varying vec3 v_normal;
    
    void main() {
      vec4 pos2 = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1);      
      gl_Position = pos2;       
      gl_PointSize = 50.0 / pos2.w;
      v_color = color;
      v_normal = normal;
    }
`;


export const fragmentShader = `
    precision highp float;

    varying vec3 v_color;
    varying vec3 v_normal;

    void main() {
      gl_FragColor = vec4(v_color, 1.0);
    }
`;
