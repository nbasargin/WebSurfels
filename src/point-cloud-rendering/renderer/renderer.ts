import { mat4, vec3 } from 'gl-matrix';
import { StanfordDragonLoader } from '../data/stanford-dragon-loader';
import { NormalVisualizationProgram } from './programs/normal-visualization-program';
import { NormalizationProgram } from './programs/normalization-program';
import { PointProgram } from './programs/point-program';

import { PointCloudDataGenerator } from '../data/point-cloud-data-generator';
import { QuadProgram } from "./programs/quad-program";
import { RendererConstants } from "./renderer-constants";
import { OffscreenFramebuffer } from "./offscreen-framebuffer";


export class Renderer {

    private static DATA_SOURCE: 'generated' | 'ply' = 'ply';

    private readonly gl: WebGL2RenderingContext;

    private offscreenFramebuffer: OffscreenFramebuffer;
    private normalVisProgram: NormalVisualizationProgram;
    private pointProgram: PointProgram;
    private normalizationProgram: NormalizationProgram;
    private quadProgram: QuadProgram;

    private readonly numPoints = RendererConstants.NUM_POINTS;

    private readonly eyePosition: vec3;
    private readonly projectionMatrix: mat4;
    private readonly modelViewMatrix: mat4;
    private readonly modelViewMatrixIT: mat4;

    public useQuads = true;

    constructor(public readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgl2');
        if (!context || !(context instanceof WebGL2RenderingContext)) {
            console.log(context);
            throw new Error('Could not initialize WebGL2 context');
        }
        this.gl = context;

        this.eyePosition = vec3.create();
        this.projectionMatrix = mat4.create();
        this.modelViewMatrix = mat4.create();
        this.modelViewMatrixIT = mat4.create();

        this.offscreenFramebuffer = new OffscreenFramebuffer(this.gl);

        this.pointProgram = new PointProgram(this.gl, this.canvas,  this.projectionMatrix, this.modelViewMatrix, this.modelViewMatrixIT, this.offscreenFramebuffer);
        this.normalVisProgram = new NormalVisualizationProgram(this.gl, this.projectionMatrix, this.modelViewMatrix);
        this.normalizationProgram = new NormalizationProgram(this.gl);

        this.quadProgram = new QuadProgram(this.gl, this.canvas, this.eyePosition, this.projectionMatrix, this.modelViewMatrix, this.modelViewMatrixIT, this.offscreenFramebuffer);

        if (Renderer.DATA_SOURCE === 'generated') {
            const dataGen = new PointCloudDataGenerator();
            const data = dataGen.generateSphere(this.numPoints);

            this.pointProgram.setData(data);
            this.normalVisProgram.setData(data);
            this.quadProgram.setData(data);
        } else {
            const dragonLoader = new StanfordDragonLoader();
            dragonLoader.load().then(data => {
                this.pointProgram.setData(data);
                this.quadProgram.setData(data);
                this.normalVisProgram.setData(data);
            });
        }


    }

    lookAt(eye: vec3 | number[], center: vec3 | number[], up: vec3 | number[]) {
        vec3.copy(this.eyePosition, eye);
        mat4.lookAt(this.modelViewMatrix, eye, center, up);
        mat4.invert(this.modelViewMatrixIT, this.modelViewMatrix);
        mat4.transpose(this.modelViewMatrixIT, this.modelViewMatrixIT);
    }

    perspective(fovRadians: number = Math.PI / 3, near: number = 0.01, far: number = 100) {
        const aspectRatio = this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1);
        mat4.perspective(this.projectionMatrix, fovRadians, aspectRatio, near, far);
    }

    render(visualizeNormals: boolean = true) {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0,0,0,0);
        this.gl.clearDepth(1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.perspective();

        if (this.useQuads) {
            this.quadProgram.render();
        }  else {
            this.pointProgram.render();
        }
        this.normalizationProgram.render();

        if (visualizeNormals) {
            this.normalVisProgram.render();
        }
    }

    /**
     * Set canvas width and height to specified values and update internal framebuffers if necessary.
     * @param width
     * @param height
     */
    setSize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.offscreenFramebuffer.resize(width, height);
    }

}
