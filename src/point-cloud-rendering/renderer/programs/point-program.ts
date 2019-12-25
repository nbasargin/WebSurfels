import { mat4 } from "gl-matrix";
import { PointCloudData } from '../../data/point-cloud-data';
import { fragmentShader, vertexShader } from '../shaders';
import { Program } from './program';

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


    constructor(
        gl: WebGL2RenderingContext,
        private canvas: HTMLCanvasElement,
        private numPoints: number,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
    ) {
        super(gl, vertexShader, fragmentShader);

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
        this.gl.uniform1f(this.uniforms.screenHeight, this.canvas.height);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);
        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.enableBuffer3f(this.buffers.color, this.attributes.color);
        this.enableBuffer3f(this.buffers.normal, this.attributes.normal);
        this.gl.drawArrays(this.gl.POINTS, 0, this.numPoints);
    }

    setData(data: PointCloudData) {
        this.setBufferData(this.buffers.pos, data.positions);
        this.setBufferData(this.buffers.color, data.colors);
        this.setBufferData(this.buffers.normal, data.normals);
    }

}
