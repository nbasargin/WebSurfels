import { Program } from './program';
import { mat4 } from 'gl-matrix';


const quadVS = `
    #version 300 es
    
    in vec3 pos;
    in vec3 splatVertices;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos + splatVertices, 1.0);
        gl_PointSize = 10.0;
    }
`.trim();

const quadFS = `
    #version 300 es
    
    out highp vec4 color;
    
    void main() {
        color = vec4(1.0, 1.0, 1.0, 1.0);
    }
`.trim();

export class QuadProgram extends Program {

    private readonly attributes: {
        pos: GLint,
        splatVertices: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
        splatVertices: WebGLBuffer,
    };

    private splatVertices = [
        -0.5, -0.5, 0,
        -0.5, 0.5, 0,
        0.5, -0.5, 0,
        0.5, 0.5, 0,
    ];

    private points = [
        0, 0, 0,
        0, 0, -1,
        0, 0, -2,
        0, 0, -3,
    ];

    constructor(
        gl: WebGL2RenderingContext,
        private canvas: HTMLCanvasElement,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
    ) {
        super(gl, quadVS, quadFS);

        this.attributes = {
            pos: gl.getAttribLocation(this.program, 'pos'),
            splatVertices: gl.getAttribLocation(this.program, 'splatVertices'),
        };

        console.log(this.attributes);

        this.uniforms = {
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: gl.createBuffer() as WebGLBuffer,
            splatVertices: gl.createBuffer() as WebGLBuffer,
        };

        this.setBufferData(this.buffers.pos, new Float32Array(this.points));
        this.setBufferData(this.buffers.splatVertices, new Float32Array(this.splatVertices));
    }

    render() {
        this.gl.useProgram(this.program);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);

        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.enableBuffer3f(this.buffers.splatVertices, this.attributes.splatVertices); //
        this.gl.vertexAttribDivisor(this.attributes.pos, 1);

        const numPoints = 4;
        this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, this.splatVertices.length / 3, numPoints);
    }

}