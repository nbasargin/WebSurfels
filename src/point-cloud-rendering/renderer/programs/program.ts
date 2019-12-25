export abstract class Program {

    public readonly gl: WebGL2RenderingContext;
    public readonly program: WebGLProgram;

    protected constructor(gl: WebGL2RenderingContext, vs: string, fs: string) {
        this.gl = gl;
        this.program = this.initShaderProgram(vs, fs);
    }

    public abstract render();


    protected setBufferData(buffer: WebGLBuffer, data: Float32Array) {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW);
    }

    protected enableBuffer3f(buffer: WebGLBuffer, attrib: GLint) {
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
