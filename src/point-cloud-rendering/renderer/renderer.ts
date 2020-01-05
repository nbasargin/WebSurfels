import { mat4, vec3 } from 'gl-matrix';
import { NormalVisualizationProgram } from './programs/normal-visualization-program';
import { NormalizationProgram } from './programs/normalization-program';
import { PointProgram } from './programs/point-program';

import { PointCloudDataGenerator } from '../data/point-cloud-data-generator';
import { LasDataLoader } from '../data/las-data-loader';


export class Renderer {

    private static USE_GENERATED_SPHERE_DATA = true;
    private static USE_ADDITIVE_BLENDING = false;

    private readonly gl: WebGL2RenderingContext;

    private normalVisProgram: NormalVisualizationProgram;
    private pointProgram: PointProgram;
    private normalizationProgram: NormalizationProgram;

    private readonly numPoints = 1000;

    private readonly projectionMatrix: mat4;
    private readonly modelViewMatrix: mat4;
    private readonly modelViewMatrixIT: mat4;

    constructor(public readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgl2');
        if (!context || !(context instanceof WebGL2RenderingContext)) {
            console.log(context);
            throw new Error('Could not initialize WebGL2 context');
        }
        this.gl = context;

        this.projectionMatrix = mat4.create();
        this.modelViewMatrix = mat4.create();
        this.modelViewMatrixIT = mat4.create();

        this.pointProgram = new PointProgram(this.gl, this.canvas, this.projectionMatrix, this.modelViewMatrix, this.modelViewMatrixIT);
        this.normalVisProgram = new NormalVisualizationProgram(this.gl, this.projectionMatrix, this.modelViewMatrix);
        this.normalizationProgram = new NormalizationProgram(this.gl);

        if (Renderer.USE_GENERATED_SPHERE_DATA) {
            const dataGen = new PointCloudDataGenerator();
            const data = dataGen.generateSphere(this.numPoints);

            this.pointProgram.setData(data);
            this.normalVisProgram.setData(data);
        } else {
            const lasDataLoader = new LasDataLoader();
            lasDataLoader.loadLas().then(data => {
                this.pointProgram.setData(data);
                this.normalVisProgram.setData(data);
            });
        }

        if (Renderer.USE_ADDITIVE_BLENDING) {
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        } else {
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.enable(this.gl.BLEND);
            this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        }

    }

    lookAt(eye: vec3 | number[], center: vec3 | number[], up: vec3 | number[]) {
        mat4.lookAt(this.modelViewMatrix, eye, center, up);
        mat4.invert(this.modelViewMatrixIT, this.modelViewMatrix);
        mat4.transpose(this.modelViewMatrixIT, this.modelViewMatrixIT);
    }

    perspective(fovRadians: number = Math.PI / 3, near: number = 0.01, far: number = 100) {
        const aspectRatio = this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1);
        mat4.perspective(this.projectionMatrix, fovRadians, aspectRatio, near, far);
    }

    render(visualizeNormals: boolean = true) {
        this.gl.viewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
        this.gl.clearColor(0,0,0,0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.perspective();

        this.pointProgram.render();
        this.normalizationProgram.render();
        if (visualizeNormals) {
            this.normalVisProgram.render();
        }
    }

}
