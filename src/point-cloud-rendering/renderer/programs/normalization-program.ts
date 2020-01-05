import { Program } from './program';

const normalizationVS = `
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

const normalizationFS = `
    #version 300 es
    
    uniform sampler2D splatColors;
    uniform sampler2D splatNormals;
    
    out highp vec4 color;
    
    void main() {
        ivec2 uv = ivec2(gl_FragCoord.xy);
        color = texelFetch(splatColors, uv, 0);
    
        // color = vec4(1,0.5,1,1);
    }
`.trim();


export class NormalizationProgram extends Program {


    private readonly uniforms: {
        splatColors: WebGLUniformLocation,
        splatNormals: WebGLUniformLocation,
    };

    constructor(gl: WebGL2RenderingContext) {
        super(gl, normalizationVS, normalizationFS);

        this.uniforms = {
            splatColors: gl.getUniformLocation(this.program, 'splatColors') as WebGLUniformLocation,
            splatNormals: gl.getUniformLocation(this.program, 'splatNormals') as WebGLUniformLocation,
        };

        gl.uniform1i(this.uniforms.splatColors, 0);
        gl.uniform1i(this.uniforms.splatNormals, 1);

    }

    render() {

        this.gl.useProgram(this.program);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.viewport(0, 0, this.gl.canvas.clientWidth, this.gl.canvas.clientHeight);
        this.gl.colorMask(true, true, true, true);
        this.gl.depthMask(true);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.disable(this.gl.BLEND);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
}
