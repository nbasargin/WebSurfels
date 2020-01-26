import { normalizationFS, normalizationVS } from '../renderer/programs/normalization-program';
import { WebGLUtils } from './web-gl-utils';

export class NormShader {

    program: WebGLProgram;

    private readonly uniformLocations: {
        splatColors: WebGLUniformLocation,
        splatNormals: WebGLUniformLocation,
    };

    constructor(private gl: WebGL2RenderingContext) {
        this.program = WebGLUtils.createProgram(gl, normalizationVS, normalizationFS);

        this.uniformLocations = {
            splatColors: gl.getUniformLocation(this.program, 'splatColors') as WebGLUniformLocation,
            splatNormals: gl.getUniformLocation(this.program, 'splatNormals') as WebGLUniformLocation,
        };

        this.gl.useProgram(this.program);
        gl.uniform1i(this.uniformLocations.splatColors, 0);
        gl.uniform1i(this.uniformLocations.splatNormals, 1);
    }

}
