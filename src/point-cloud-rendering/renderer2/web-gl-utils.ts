export class WebGLUtils {

    static createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram {
        const vertexShader = WebGLUtils.createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        if (!shaderProgram) {
            throw new Error('Could not create shader program!');
        }
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            throw new Error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        }
        return shaderProgram;
    }

    static createShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
        const shader = gl.createShader(type);
        if (!shader) {
            throw new Error('Could not create shader!')
        }
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw new Error('An error occurred compiling the shader: ' + gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    static createBuffer(gl: WebGL2RenderingContext, data: Float32Array): WebGLBuffer {
        const buffer: WebGLBuffer = gl.createBuffer() as WebGLBuffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return buffer;
    }

}
