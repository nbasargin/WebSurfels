import { mat4 } from 'gl-matrix';
import { PointCloudData } from '../../data/point-cloud-data';
import { Program } from './program';

const pointVS = `
    // precision highp float;

    attribute vec3 pos;
    attribute vec3 color;
    attribute vec3 normal; 

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uScreenHeight;

    varying vec3 v_color;
    varying float rotation;
    varying float angle;

    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1);
        v_color = color;
        
        vec4 projected_normal = uProjectionMatrix * uModelViewMatrix * vec4(normal, 0);
        rotation = atan(projected_normal.y / projected_normal.x);
        angle = acos(dot(normalize(projected_normal.xyz), vec3(0,0,1)));

        float world_point_size = 0.5 * 0.03;  // 0.5 equals a square with world size of 1x1
        float height_ratio = uScreenHeight ;

        gl_PointSize = world_point_size * height_ratio * uProjectionMatrix[1][1] / gl_Position.w;
    }
`;

const pointFS = `
    #define PI radians(180.0)

    precision highp float;

    varying vec3 v_color;
    varying float rotation;
    varying float angle;

    void main() {
        float squeeze = angle;
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        
        float sin_r = sin(rotation);
        float cos_r = cos(rotation);
        // float sin_s = sin(squeeze);
        float cos_s = cos(squeeze);
        
        float x_trans = (cos_r * cxy.x - sin_r * cxy.y);
        float y_trans = cos_s * (sin_r * cxy.x + cos_r * cxy.y);
        
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
