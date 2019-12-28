import { mat4 } from 'gl-matrix';
import { PointCloudData } from '../../data/point-cloud-data';
import { Program } from './program';

const pointVS = `
    // precision highp float;

    attribute vec3 pos;
    attribute vec3 color;
    attribute vec3 normal; 

    uniform mat4 uModelViewMatrix;
    uniform mat4 uModelViewMatrixIT;
    uniform mat4 uProjectionMatrix;
    uniform float uScreenHeight;

    varying vec3 v_color;
    varying float rotation;
    varying float squeeze;

    void main() {
        vec4 vertex_world_space = uModelViewMatrix * vec4(pos, 1);
        vec3 normal_world_space = normalize((uModelViewMatrixIT * vec4(normal, 0)).xyz);
    
        gl_Position = uProjectionMatrix * vertex_world_space;
        v_color = color;
        
        vec3 n_vertex_world_space = normalize(vertex_world_space.xyz);
        vec3 axis = cross(n_vertex_world_space, normal_world_space);                
        rotation = atan(axis.y / axis.x);        
        squeeze = dot(n_vertex_world_space, normal_world_space);

        float world_point_size = 0.5 * 0.15;  // 0.5 equals a square with world size of 1x1

        // small points cause problems, so limit size to 5
        gl_PointSize = max(5.0, world_point_size * uScreenHeight * uProjectionMatrix[1][1] / gl_Position.w);
    }
`;

const pointFS = `
    #define PI radians(180.0)

    precision highp float;

    varying vec3 v_color;
    varying float rotation;
    varying float squeeze;

    void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0; 
        
        float sin_r = sin(rotation);
        float cos_r = cos(rotation);
        // limit squeezing to 80% -> at least one pixel should be visible given min point size of 5
        float cos_s = max(0.2, abs(squeeze)); 
        
        float x_trans = cos_s * (cos_r * cxy.x - sin_r * cxy.y);
        float y_trans = (sin_r * cxy.x + cos_r * cxy.y);
        
        if (x_trans * x_trans + y_trans * y_trans > cos_s * cos_s) {        
            discard;
        }
        
        gl_FragColor = vec4(v_color, 1.0);
    }
`;

export class PointProgram extends Program {

    private readonly attributes: {
        pos: GLint,
        color: GLint,
        normal: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
        modelViewMatrixIT: WebGLUniformLocation,
        screenHeight: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
        color: WebGLBuffer,
        normal: WebGLBuffer,
    };

    private numPoints: number = 0;

    constructor(
        gl: WebGL2RenderingContext,
        private canvas: HTMLCanvasElement,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
        private modelViewMatrixIT: mat4,
    ) {
        super(gl, pointVS, pointFS);

        this.attributes = {
            pos: this.gl.getAttribLocation(this.program, 'pos'),
            color: this.gl.getAttribLocation(this.program, 'color'),
            normal: this.gl.getAttribLocation(this.program, 'normal'),
        };

        this.uniforms = {
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
            modelViewMatrixIT: this.gl.getUniformLocation(this.program, 'uModelViewMatrixIT') as WebGLUniformLocation,
            screenHeight: this.gl.getUniformLocation(this.program, 'uScreenHeight') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: this.gl.createBuffer() as WebGLBuffer,
            color: this.gl.createBuffer() as WebGLBuffer,
            normal: this.gl.createBuffer() as WebGLBuffer,
        };
    }

    render() {
        this.gl.useProgram(this.program);
        // noinspection JSSuspiciousNameCombination
        this.gl.uniform1f(this.uniforms.screenHeight, this.gl.drawingBufferHeight);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrixIT, false, this.modelViewMatrixIT);
        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.enableBuffer3f(this.buffers.color, this.attributes.color);
        this.enableBuffer3f(this.buffers.normal, this.attributes.normal);
        this.gl.drawArrays(this.gl.POINTS, 0, this.numPoints);
    }

    setData(data: PointCloudData) {
        this.numPoints = data.positions.length / 3;
        this.setBufferData(this.buffers.pos, data.positions);
        this.setBufferData(this.buffers.color, data.colors);
        this.setBufferData(this.buffers.normal, data.normals);
    }

}
