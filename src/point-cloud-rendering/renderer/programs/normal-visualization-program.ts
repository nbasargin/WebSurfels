import { mat4 } from 'gl-matrix';
import { PointCloudData } from '../../data/point-cloud-data';
import { Program } from './program';

const normalVisualizationVS = `
    attribute vec3 pos;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    void main() {
      gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(pos, 1);      
    }
`;

const normalVisualizationFS = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 0.25);
    }
`;

export class NormalVisualizationProgram extends Program {

    private readonly attributes: {
        pos: GLint,
    };

    private readonly uniforms: {
        projectionMatrix: WebGLUniformLocation,
        modelViewMatrix: WebGLUniformLocation,
    };

    private readonly buffers: {
        pos: WebGLBuffer,
    };

    private numPoints: number = 0;

    constructor(
        gl: WebGL2RenderingContext,
        private projectionMatrix: mat4,
        private modelViewMatrix: mat4,
    ) {
        super(gl, normalVisualizationVS, normalVisualizationFS);

        this.attributes = {
            pos: this.gl.getAttribLocation(this.program, 'pos'),
        };

        this.uniforms = {
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix') as WebGLUniformLocation,
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix') as WebGLUniformLocation,
        };

        this.buffers = {
            pos: this.gl.createBuffer() as WebGLBuffer,
        };
    }

    render() {
        this.gl.useProgram(this.program);
        this.gl.disable(this.gl.DEPTH_TEST);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);
        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.gl.drawArrays(this.gl.LINES, 0, this.numPoints * 2);
    }

    setData(data: PointCloudData) {
        this.numPoints = data.positions.length / 3;
        const normalLines = NormalVisualizationProgram.computeNormalLines(data.positions, data.normals);
        this.setBufferData(this.buffers.pos, normalLines);
    }

    private static computeNormalLines(positions: Float32Array, normals: Float32Array): Float32Array {
        const normalLines = new Float32Array(positions.length * 2);
        const pointNumber = positions.length / 3;

        for (let i = 0; i < pointNumber; i++) {
            const offsetSource = i * 3;
            const offsetTarget = i * 6;

            normalLines[offsetTarget] = positions[offsetSource];
            normalLines[offsetTarget + 1] = positions[offsetSource + 1];
            normalLines[offsetTarget + 2] = positions[offsetSource + 2];

            normalLines[offsetTarget + 3] = positions[offsetSource] + normals[offsetSource] * 0.2;
            normalLines[offsetTarget + 4] = positions[offsetSource + 1] + normals[offsetSource + 1] * 0.2;
            normalLines[offsetTarget + 5] = positions[offsetSource + 2] + normals[offsetSource + 2] * 0.2;
        }

        return normalLines;
    }
}
