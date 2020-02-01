import { WebGLUtils } from './web-gl-utils';

export const normalizationVS = `
    #version 300 es
    
    const vec4 pos[4] = vec4[4](
        vec4(-1, 1, 0.5, 1),
        vec4(-1, -1, 0.5, 1),
        vec4(1, 1, 0.5, 1),
        vec4(1, -1, 0.5, 1)
    );
    void main(void){
        gl_Position = pos[gl_VertexID];
    }
`.trim();

export const normalizationFS = `
    #version 300 es
    
    uniform sampler2D splatColors;
    uniform sampler2D splatNormals;
    
    out highp vec4 color;
    
    void main() {
        ivec2 uv = ivec2(gl_FragCoord.xy);
        color = texelFetch(splatColors, uv, 0);
        color /= color.w;
    
        // color = vec4(1,0.5,1,1);
    }
`.trim();


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
