import { mat4, vec3 } from 'gl-matrix';
import { Frustum } from './frustum';

import { OffscreenFramebuffer } from './offscreen-framebuffer';
import { NormShader } from './norm-shader';
import { RendererNode } from './renderer-node';
import { SplatShader } from './splat-shader';
import { WebGLUtils } from './web-gl-utils';

export class Renderer2 {

    public readonly nodes: Set<RendererNode> = new Set();
    public readonly frustum: Frustum;

    private readonly gl: WebGL2RenderingContext;
    private readonly offscreenFramebuffer: OffscreenFramebuffer;
    private readonly splatShader: SplatShader;
    private readonly normShader: NormShader;

    private readonly uniforms: {
        eyePosition: vec3,
        projectionMatrix: mat4,
        modelViewMatrix: mat4,
        modelViewMatrixIT: mat4,
    };

    private readonly perspectiveParams: {
        fovRadians: number,
        near: number,
        far: number,
    };

    constructor(public readonly canvas: HTMLCanvasElement, initialWidth: number, initialHeight: number) {
        const context = canvas.getContext('webgl2');
        if (!context || !(context instanceof WebGL2RenderingContext)) {
            throw new Error('Could not initialize WebGL2 context!');
        }
        this.gl = context;
        this.offscreenFramebuffer = new OffscreenFramebuffer(this.gl);
        this.frustum = new Frustum();

        // ext check
        const extensions = ['EXT_color_buffer_float', 'EXT_float_blend'];
        for (const ext of extensions) {
            if (!this.gl.getExtension(ext)) {
                console.error(`Required WebGL extensions missing: ${ext}`);
            }
        }

        this.splatShader = new SplatShader(this.gl);
        this.normShader = new NormShader(this.gl);

        this.uniforms = {
            eyePosition: vec3.create(),
            projectionMatrix: mat4.create(),
            modelViewMatrix: mat4.create(),
            modelViewMatrixIT: mat4.create(),
        };

        this.perspectiveParams = {
            fovRadians: Math.PI / 3,
            near: 0.01,
            far: 1000,
        };

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clearDepth(1.0);

        this.setCanvasSize(initialWidth, initialHeight);
        this.setCameraOrientation([0, 0, 0], [0, 0, -1], [0, 1, 0]);
    }

    setCameraOrientation(eye: vec3 | number[], target: vec3 | number[], up: vec3 | number[]) {
        vec3.copy(this.uniforms.eyePosition, eye);
        mat4.lookAt(this.uniforms.modelViewMatrix, eye, target, up);
        mat4.invert(this.uniforms.modelViewMatrixIT, this.uniforms.modelViewMatrix);
        mat4.transpose(this.uniforms.modelViewMatrixIT, this.uniforms.modelViewMatrixIT);
        this.frustum.setCameraOrientation(eye, target, up);
    }

    addData(positions: Float32Array, sizes: Float32Array, colors: Float32Array, normals: Float32Array): RendererNode {
        const node: RendererNode = {
            visible: true,
            numPoints: positions.length / 3,
            buffers: {
                positions: WebGLUtils.createBuffer(this.gl, positions),
                sizes: WebGLUtils.createBuffer(this.gl, sizes),
                colors: WebGLUtils.createBuffer(this.gl, colors),
                normals: WebGLUtils.createBuffer(this.gl, normals),
            }
        };
        this.nodes.add(node);
        return node;
    }

    removeNode(node: RendererNode) {
        this.gl.deleteBuffer(node.buffers.positions);
        this.gl.deleteBuffer(node.buffers.sizes);
        this.gl.deleteBuffer(node.buffers.colors);
        this.gl.deleteBuffer(node.buffers.normals);
        node.numPoints = 0;
        this.nodes.delete(node);
    }

    removeAllNodes() {
        const nodes = [...this.nodes];
        for (const node of nodes) {
            this.removeNode(node);
        }
    }

    setCanvasSize(width: number, height: number) {
        this.gl.viewport(0, 0, width, height);
        this.canvas.width = width;
        this.canvas.height = height;
        this.offscreenFramebuffer.resize(width, height);
        this.updatePerspectiveMatrix();
    }

    setPerspectiveParams(fovRadians: number, near: number, far: number) {
        this.perspectiveParams.fovRadians = fovRadians;
        this.perspectiveParams.near = near;
        this.perspectiveParams.far = far;
        this.updatePerspectiveMatrix();
    }

    render(nodes: Iterable<RendererNode> = this.nodes, disableSplatting: boolean = false): {nodesDrawn: number, pointsDrawn: number} {
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);

        this.gl.enableVertexAttribArray(this.splatShader.attributeLocations.pos);
        this.gl.enableVertexAttribArray(this.splatShader.attributeLocations.size);
        this.gl.enableVertexAttribArray(this.splatShader.attributeLocations.color);
        this.gl.enableVertexAttribArray(this.splatShader.attributeLocations.normal);
        this.gl.enableVertexAttribArray(this.splatShader.attributeLocations.quadVertex);

        this.gl.vertexAttribDivisor(this.splatShader.attributeLocations.pos, 1);
        this.gl.vertexAttribDivisor(this.splatShader.attributeLocations.size, 1);
        this.gl.vertexAttribDivisor(this.splatShader.attributeLocations.color, 1);
        this.gl.vertexAttribDivisor(this.splatShader.attributeLocations.normal, 1);

        this.gl.useProgram(this.splatShader.program);
        this.gl.uniform3fv(this.splatShader.uniformLocations.eyePos, this.uniforms.eyePosition);
        this.gl.uniformMatrix4fv(this.splatShader.uniformLocations.projectionMatrix, false, this.uniforms.projectionMatrix);
        this.gl.uniformMatrix4fv(this.splatShader.uniformLocations.modelViewMatrix, false, this.uniforms.modelViewMatrix);
        this.gl.uniformMatrix4fv(this.splatShader.uniformLocations.modelViewMatrixIT, false, this.uniforms.modelViewMatrixIT);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.splatShader.quadVertexBuffer);
        this.gl.vertexAttribPointer(this.splatShader.attributeLocations.quadVertex, 3, this.gl.FLOAT, false, 0, 0);

        this.offscreenFramebuffer.bind();

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        let drawStats: {nodesDrawn: number, pointsDrawn: number};
        if (!disableSplatting) {
            // depth pass
            this.gl.depthMask(true);
            this.gl.colorMask(false, false, false, false);
            this.gl.uniform1i(this.splatShader.uniformLocations.depthPass, 1);
            this.drawNodes(nodes);

            // color pass
            this.gl.depthMask(false);
            this.gl.colorMask(true, true, true, true);
            this.gl.uniform1i(this.splatShader.uniformLocations.depthPass, 0);
            drawStats = this.drawNodes(nodes);

        } else {
            // one single pass
            this.gl.disable(this.gl.BLEND);
            this.gl.depthMask(true);
            this.gl.colorMask(true, true, true, true);
            this.gl.uniform1i(this.splatShader.uniformLocations.depthPass, 0);
            drawStats = this.drawNodes(nodes);
        }

        this.offscreenFramebuffer.unbind();

        // normalization pass
        this.gl.useProgram(this.normShader.program);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
        this.gl.colorMask(true, true, true, true);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        if (drawStats.nodesDrawn > 0) {
            this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        }
        return drawStats;
    }

    private drawNodes(nodes: Iterable<RendererNode>): {nodesDrawn: number, pointsDrawn: number} {
        let nodesDrawn = 0;
        let pointsDrawn = 0;
        for (const node of nodes) {
            if (!node.visible) {
                continue;
            }
            nodesDrawn++;
            pointsDrawn += node.numPoints;

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, node.buffers.positions);
            this.gl.vertexAttribPointer(this.splatShader.attributeLocations.pos, 3, this.gl.FLOAT, false, 0, 0);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, node.buffers.sizes);
            this.gl.vertexAttribPointer(this.splatShader.attributeLocations.size, 1, this.gl.FLOAT, false, 0, 0);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, node.buffers.colors);
            this.gl.vertexAttribPointer(this.splatShader.attributeLocations.color, 3, this.gl.FLOAT, false, 0, 0);

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, node.buffers.normals);
            this.gl.vertexAttribPointer(this.splatShader.attributeLocations.normal, 3, this.gl.FLOAT, false, 0, 0);

            const verticesPerQuad = 4;
            this.gl.drawArraysInstanced(this.gl.TRIANGLE_STRIP, 0, verticesPerQuad, node.numPoints);
        }

        return {nodesDrawn, pointsDrawn};
    }

    private updatePerspectiveMatrix() {
        const aspectRatio = this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1);
        const p = this.perspectiveParams;
        mat4.perspective(this.uniforms.projectionMatrix, p.fovRadians, aspectRatio, p.near, p.far);
        this.frustum.setPerspectiveParams(p.fovRadians, aspectRatio, p.near, p.far);
    }

}
