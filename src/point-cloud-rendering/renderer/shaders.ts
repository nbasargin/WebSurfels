/**
 * Some GLSL shaders here.
 */

export const vertexShader = `
    // precision highp float;
    
    attribute vec3 pos;
    attribute vec3 color;
    attribute vec3 normal; 
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uScreenHeight;
    
    varying vec3 v_color;
    varying vec3 v_normal;
    
    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1);
      v_color = color;
      v_normal = normal;
      
      float world_point_size = 2.0;  // 250 equals a square with world size of 1x1
      float height_ratio = uScreenHeight / 500.0;
      
      gl_PointSize = world_point_size * height_ratio * uProjectionMatrix[1][1] / gl_Position.w;
      
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
