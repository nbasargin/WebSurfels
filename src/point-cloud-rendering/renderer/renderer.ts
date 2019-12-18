import { mat4, vec3 } from 'gl-matrix';

import { fragmentShader, vertexShader } from './shaders';
import { PointCloudDataGenerator } from '../data/point-cloud-data-generator';


export class Renderer {

    private gl: WebGLRenderingContext;

    private readonly program: WebGLProgram;

    private readonly attributes: {
        from: GLint,
        to: GLint,
        color: GLint,
    };

    private readonly uniforms: {
        progress: WebGLUniformLocation,
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
    };

    private readonly buffers: {
        from: WebGLBuffer,
        to: WebGLBuffer,
        color: WebGLBuffer,
    };

    private progress: number = 0;
    private readonly numPoints = 100000;

    private readonly projectionMatrix: mat4;
    private readonly modelViewMatrix: mat4;

    constructor(public readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgl');
        if (!context || !(context instanceof WebGLRenderingContext)) {
            throw new Error('Could not initialize WebGL2 context');
        }
        this.gl = context;

        this.program = this.initShaderProgram(vertexShader, fragmentShader);

        this.attributes = {
            from: this.gl.getAttribLocation(this.program, 'from'),
            to: this.gl.getAttribLocation(this.program, 'to'),
            color: this.gl.getAttribLocation(this.program, 'color'),
        };

        this.uniforms = {
            progress: this.gl.getUniformLocation(this.program, 'progress') as WebGLUniformLocation,
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
        };

        this.buffers = {
            from: this.gl.createBuffer() as WebGLBuffer,
            to: this.gl.createBuffer() as WebGLBuffer,
            color: this.gl.createBuffer() as WebGLBuffer,
        };

        this.projectionMatrix = mat4.create();
        this.modelViewMatrix = mat4.create();

        this.lookAt([0,0,2.5], [0,0,0], [0, 1, 0]);

        const dataGen = new PointCloudDataGenerator();
        const data = dataGen.generateSphere(this.numPoints);
        const data2 = dataGen.generateSphere(this.numPoints);

        this.setBufferData(this.buffers.from, data.positions);
        this.setBufferData(this.buffers.to, data2.positions);
        this.setBufferData(this.buffers.color, data2.colors);

        this.setBufferAttrib();

        this.gl.useProgram(this.program);
    }

    lookAt(eye: vec3 | number[], center: vec3 | number[], up: vec3 | number[]) {
        mat4.lookAt(this.modelViewMatrix, eye, center, up);
    }

    perspective(fovRadians: number = Math.PI / 3, near: number = 0.01, far: number = 100) {
        const aspectRatio = this.canvas.width / Math.max(this.canvas.height, 1);
        mat4.perspective(this.projectionMatrix, fovRadians, aspectRatio, near, far);
    }

    render() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.progress = Math.min(1, this.progress + 0.005);
        this.gl.uniform1f(this.uniforms.progress, this.progress);

        this.perspective();
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);

        this.gl.clearColor(0,0,0,0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        const offset = 0;
        this.gl.drawArrays(this.gl.POINTS, offset, this.numPoints);
    }

    private setBufferData(buffer: WebGLBuffer, data: Float32Array) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    }


    private setBufferAttrib() {
        const numComponents = 3;
        const type = this.gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.from);
        this.gl.vertexAttribPointer(this.attributes.from, numComponents, type, normalize, stride, offset);
        this.gl.enableVertexAttribArray(this.attributes.from);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.to);
        this.gl.vertexAttribPointer(this.attributes.to, numComponents, type, normalize, stride, offset);
        this.gl.enableVertexAttribArray(this.attributes.to);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.color);
        this.gl.vertexAttribPointer(this.attributes.color, numComponents, type, normalize, stride, offset);
        this.gl.enableVertexAttribArray(this.attributes.color);
    }

    private initShaderProgram(vsSource: string, fsSource: string): WebGLProgram {
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = this.gl.createProgram();
        if (!shaderProgram) {
            throw new Error('Could not create shader program!');
        }
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);

        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            throw new Error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
        }
        return shaderProgram;
    }

    private loadShader(type, source): WebGLShader {
        const shader = this.gl.createShader(type);
        if (!shader) {
            throw new Error('Could not create shader!')
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error('An error occurred compiling the shader: ' + this.gl.getShaderInfoLog(shader));
        }
        return shader;
    }
}
