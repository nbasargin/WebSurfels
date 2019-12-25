import { mat4 } from "gl-matrix";
import { PointCloudData } from '../../data/point-cloud-data';
import { PointCloudDataGenerator } from '../../data/point-cloud-data-generator';
import { normalFragmentShader, normalVertexShader } from '../shaders';
import { Program } from './program';

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
        super(gl, normalVertexShader, normalFragmentShader);

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
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.modelViewMatrix, false, this.modelViewMatrix);
        this.enableBuffer3f(this.buffers.pos, this.attributes.pos);
        this.gl.drawArrays(this.gl.LINES, 0, this.numPoints * 2);
    }

    setData(data: PointCloudData) {
        this.numPoints = data.positions.length / 3;
        const dataGen = new PointCloudDataGenerator();
        const normalLines = dataGen.computeNormalLines(data.positions, data.normals);
        this.setBufferData(this.buffers.pos, normalLines);
    }


}
