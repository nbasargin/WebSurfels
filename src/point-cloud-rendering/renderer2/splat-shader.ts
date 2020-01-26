import { quadFS, quadVS } from '../renderer/programs/quad-program';
import { WebGLUtils } from './web-gl-utils';


export class SplatShader {

    program: WebGLProgram;

    quadVertexBuffer: WebGLBuffer;

    readonly attributeLocations: {
        pos: GLint,
        color: GLint,
        normal: GLint,
        quadVertex: GLint,
    };

    readonly uniformLocations: {
        eyePos: WebGLUniformLocation,
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
        modelViewMatrixIT: WebGLUniformLocation,
        depthPass: WebGLUniformLocation,
    };

    constructor(private gl: WebGL2RenderingContext) {
        const quadData = [
            -0.5, -0.5, 0,
            -0.5, 0.5, 0,
            0.5, -0.5, 0,
            0.5, 0.5, 0,
        ];
        this.quadVertexBuffer = WebGLUtils.createBuffer(gl, new Float32Array(quadData));

        this.program = WebGLUtils.createProgram(gl, quadVS, quadFS);

        this.attributeLocations = {
            pos: gl.getAttribLocation(this.program, 'pos'),
            color: gl.getAttribLocation(this.program, 'color'),
            normal: gl.getAttribLocation(this.program, 'normal'),
            quadVertex: gl.getAttribLocation(this.program, 'quadVertex'),
        };

        this.uniformLocations = {
            eyePos: gl.getUniformLocation(this.program, 'uEyePos') as WebGLUniformLocation,
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
            modelViewMatrixIT: gl.getUniformLocation(this.program, 'uModelViewMatrixIT') as WebGLUniformLocation,
            depthPass: gl.getUniformLocation(this.program, 'uDepthPass') as WebGLUniformLocation,
        };
    }

}
