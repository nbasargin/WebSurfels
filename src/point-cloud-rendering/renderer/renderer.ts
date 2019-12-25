import { mat4, vec3 } from 'gl-matrix';

import { fragmentShader, normalFragmentShader, normalVertexShader, vertexShader } from './shaders';
import { PointCloudDataGenerator } from '../data/point-cloud-data-generator';


export class Renderer {

    private gl: WebGL2RenderingContext;

    private readonly program: WebGLProgram;
    private readonly programNormalVis: WebGLProgram;

    private readonly attributes: {
        pos: GLint,
        color: GLint,
        normal: GLint,
    };

    private readonly attributesNormalVis: {
        pos: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
        screenHeight: WebGLUniformLocation,
    };

    private readonly uniformsNormalVis: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
        color: WebGLBuffer,
        normal: WebGLBuffer,
    };

    private readonly buffersNormalVis: {
        pos: WebGLBuffer,
    };

    private readonly numPoints = 100000;

    private readonly projectionMatrix: mat4;
    private readonly modelViewMatrix: mat4;

    constructor(public readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgl2');
        if (!context || !(context instanceof WebGL2RenderingContext)) {
            console.log(context);
            throw new Error('Could not initialize WebGL2 context');
        }
        this.gl = context;

        this.program = this.initShaderProgram(vertexShader, fragmentShader);
        this.programNormalVis = this.initShaderProgram(normalVertexShader, normalFragmentShader);

        this.attributes = {
            pos: this.gl.getAttribLocation(this.program, 'pos'),
            color: this.gl.getAttribLocation(this.program, 'color'),
            normal: this.gl.getAttribLocation(this.program, 'normal'),
        };

        this.attributesNormalVis = {
            pos: this.gl.getAttribLocation(this.programNormalVis, 'pos'),
        };

        this.uniforms = {
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
            screenHeight: this.gl.getUniformLocation(this.program, 'uScreenHeight') as WebGLUniformLocation,
        };

        this.uniformsNormalVis = {
            projectionMatrix: this.gl.getUniformLocation(this.programNormalVis, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: this.gl.getUniformLocation(this.programNormalVis, 'uModelViewMatrix') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: this.gl.createBuffer() as WebGLBuffer,
            color: this.gl.createBuffer() as WebGLBuffer,
            normal: this.gl.createBuffer() as WebGLBuffer,
        };

        this.buffersNormalVis = {
            pos: this.gl.createBuffer() as WebGLBuffer,
        };

        this.projectionMatrix = mat4.create();
        this.modelViewMatrix = mat4.create();

        this.lookAt([0,0,2.5], [0,0,0], [0, 1, 0]);

        const dataGen = new PointCloudDataGenerator();
        const data = dataGen.generateSphere(this.numPoints);

        const normalLines = dataGen.computeNormalLines(data.positions, data.normals);

        this.setBufferData(this.buffers.pos, data.positions);
        this.setBufferData(this.buffers.color, data.colors);
        this.setBufferData(this.buffers.normal, data.normals);

        this.setBufferData(this.buffersNormalVis.pos, normalLines);

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }

    lookAt(eye: vec3 | number[], center: vec3 | number[], up: vec3 | number[]) {
        mat4.lookAt(this.modelViewMatrix, eye, center, up);
    }

    perspective(fovRadians: number = Math.PI / 3, near: number = 0.01, far: number = 100) {
        const aspectRatio = this.canvas.width / Math.max(this.canvas.height, 1);
        mat4.perspective(this.projectionMatrix, fovRadians, aspectRatio, near, far);
    }

    render() {
        const offset = 0;

        // general setup

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0,0,0,0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.perspective();

        // draw points

        this.gl.useProgram(this.program);
        // noinspection JSSuspiciousNameCombination
        this.gl.uniform1f(this.uniforms.screenHeight, this.canvas.height);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);
        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.enableBuffer3f(this.buffers.color, this.attributes.color);
        this.enableBuffer3f(this.buffers.normal, this.attributes.normal);
        this.gl.drawArrays(this.gl.POINTS, offset, this.numPoints);

        // normal visualization

        this.gl.useProgram(this.programNormalVis);
        this.gl.uniformMatrix4fv(this.uniformsNormalVis.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniformsNormalVis.modelViewMatrix, false, this.modelViewMatrix);
        this.enableBuffer3f(this.buffersNormalVis.pos, this.attributesNormalVis.pos);
        this.gl.drawArrays(this.gl.LINES, offset, this.numPoints * 2);
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
