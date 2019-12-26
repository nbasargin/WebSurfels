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
    varying float angle;
    varying float point_size;

    void main() {
        vec4 vertex_world_space = uModelViewMatrix * vec4(pos, 1);
        vec4 normal_world_space = uModelViewMatrixIT * vec4(normal, 0);
    
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1);
        v_color = color;
        
        vec4 projected_normal = normalize(uProjectionMatrix * uModelViewMatrixIT * vec4(normal, 0));
        rotation = atan(projected_normal.y / projected_normal.x);
        
        angle = acos(dot(normalize(vertex_world_space.xyz), normalize(normal_world_space.xyz)));

        float world_point_size = 0.5 * 0.05;  // 0.5 equals a square with world size of 1x1
        float height_ratio = uScreenHeight ;

        // limit point size to be 2 pixels at least
        // TODO: instead of limiting minimal points size, do not discard fragments
        gl_PointSize = world_point_size * height_ratio * uProjectionMatrix[1][1] / gl_Position.w;
        point_size = gl_PointSize;
    }
`;

const pointFS = `
    #define PI radians(180.0)

    precision highp float;

    varying vec3 v_color;
    varying float rotation;
    varying float angle;
    varying float point_size;

    void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        
        float sin_r = sin(rotation);
        float cos_r = cos(rotation);
        float cos_s = cos(angle); //max(0.0, cos(angle));  // limit squeezing to 90%
        
        float x_trans = (cos_r * cxy.x - sin_r * cxy.y);
        float y_trans = cos_s * (sin_r * cxy.x + cos_r * cxy.y);
        
        // TODO: do not discard fragments if gl_PointSize is small
        //       only create spherical shapes for gl_PointSize larger than 2 
        
        if (x_trans * x_trans + y_trans * y_trans > cos_s * cos_s && point_size >= 2.0) {        
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
