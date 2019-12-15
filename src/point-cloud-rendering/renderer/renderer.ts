import { fragmentShader, vertexShader } from "./shaders";
import { PointCloudDataGenerator } from "../data/point-cloud-data-generator";

export class Renderer {

    private gl: WebGLRenderingContext;

    private readonly program: WebGLProgram;

    private readonly attributes: {
        from: GLint,
        to: GLint
    };

    private readonly uniforms: {
        progress: WebGLUniformLocation,
        projectionMatrix: WebGLUniformLocation
    };

    private readonly buffers: {
        from: WebGLBuffer,
        to: WebGLBuffer,
    };

    private progress: number = 0;

    private readonly numPoints = 10000;

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
        };

        this.uniforms = {
            progress: this.gl.getUniformLocation(this.program, 'progress') as WebGLUniformLocation,
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            // modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix'),
        };

        this.buffers = {
            from: this.gl.createBuffer() as WebGLBuffer,
            to: this.gl.createBuffer() as WebGLBuffer
        };

        const dataGen = new PointCloudDataGenerator();
        const data = dataGen.generateSphere(this.numPoints);
        const data2 = dataGen.generateSphere(this.numPoints);

        this.setBufferData(this.buffers.from, data.positions);
        this.setBufferData(this.buffers.to, data2.positions);

        this.setBufferAttrib();

        this.gl.useProgram(this.program);
    }

    render() {
        this.progress =  Math.min(1, this.progress + 0.01);
        const aspectRatio = this.canvas.width / Math.max(this.canvas.height, 1);

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        this.gl.uniform1f(this.uniforms.progress, this.progress);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false,
            new Float32Array(Renderer.perspectiveMatrix(Math.PI / 3, aspectRatio, 0.01, 100)));

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
        const numComponents = 2;
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

    private static perspectiveMatrix(fieldOfViewInRadians, aspectRatio, near, far) {
        const f = 1.0 / Math.tan(fieldOfViewInRadians / 2);
        const rangeInv = 1 / (near - far);

        return [
            f / aspectRatio, 0,                          0,   0,
            0,               f,                          0,   0,
            0,               0,    (near + far) * rangeInv,  -1,
            0,               0,  near * far * rangeInv * 2,   0
        ];
    }
}
