import { mat4, vec3 } from 'gl-matrix';

import { fragmentShader, vertexShader } from './shaders';
import { PointCloudDataGenerator } from '../data/point-cloud-data-generator';


export class Renderer {

    private gl: WebGLRenderingContext;

    private readonly program: WebGLProgram;

    private readonly attributes: {
        pos: GLint,
        color: GLint,
        normal: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
        color: WebGLBuffer,
        normal: WebGLBuffer,
    };

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
            pos: this.gl.getAttribLocation(this.program, 'pos'),
            color: this.gl.getAttribLocation(this.program, 'color'),
            normal: this.gl.getAttribLocation(this.program, 'normal'),
        };

        this.uniforms = {
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: this.gl.createBuffer() as WebGLBuffer,
            color: this.gl.createBuffer() as WebGLBuffer,
            normal: this.gl.createBuffer() as WebGLBuffer,
        };

        this.projectionMatrix = mat4.create();
        this.modelViewMatrix = mat4.create();

        this.lookAt([0,0,2.5], [0,0,0], [0, 1, 0]);

        const dataGen = new PointCloudDataGenerator();
        const data = dataGen.generateSphere(this.numPoints);

        this.setBufferData(this.buffers.pos, data.positions);
        this.setBufferData(this.buffers.color, data.colors);
        this.setBufferData(this.buffers.normal, data.normals);

        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.enableBuffer3f(this.buffers.color, this.attributes.color);
        this.enableBuffer3f(this.buffers.normal, this.attributes.normal);

        this.gl.useProgram(this.program);
        this.gl.enable(this.gl.DEPTH_TEST);
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

    private enableBuffer3f(buffer: WebGLBuffer, attrib: GLint) {
        const numComponents = 3;
        const type = this.gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(attrib, numComponents, type, normalize, stride, offset);
        this.gl.enableVertexAttribArray(attrib);
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
