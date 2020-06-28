import { PointCloudData } from '../data/point-cloud-data';
import { Camera } from './camera';
import { DirectionalLight } from './directional-light';
import { OffscreenFramebuffer } from './offscreen-framebuffer';
import { RendererOptions } from './renderer-options';
import { RenderingStats } from './rendering-stats';
import { NormShader } from './shader/norm-shader';
import { RendererNode } from './renderer-node';
import { SplatShader } from './shader/splat-shader';
import { WebGLUtils } from './web-gl-utils';

export class Renderer {

    // rendering stats from the latest render() call
    public stats: RenderingStats = {
        nodesLoaded: 0,
        nodesDrawn: 0,
        pointsLoaded: 0,
        pointsDrawn: 0,
    };

    public readonly nodes: Set<RendererNode> = new Set();
    public readonly camera: Camera;
    public readonly light: DirectionalLight;
    public readonly options: RendererOptions;

    private readonly gl: WebGL2RenderingContext;
    private readonly offscreenFramebuffer: OffscreenFramebuffer;
    private readonly splatShader: SplatShader;
    private readonly normShader: NormShader;

    private pointsInMemory: number = 0;

    constructor(public readonly canvas: HTMLCanvasElement) {
        const context = canvas.getContext('webgl2');
        if (!context || !(context instanceof WebGL2RenderingContext)) {
            throw new Error('Could not initialize WebGL2 context!');
        }
        this.gl = context;
        this.offscreenFramebuffer = new OffscreenFramebuffer(this.gl);
        this.camera = new Camera();
        this.light = new DirectionalLight();
        this.options = new RendererOptions(this.gl);

        // ext check
        const extensions = ['EXT_color_buffer_float', 'EXT_float_blend'];
        for (const ext of extensions) {
            if (!this.gl.getExtension(ext)) {
                console.error(`Required WebGL extensions missing: ${ext}`);
            }
        }

        this.splatShader = new SplatShader(this.gl);
        this.normShader = new NormShader(this.gl);

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clearDepth(1.0);

        this.gl.depthFunc(this.gl.LEQUAL);

        const bb = canvas.getBoundingClientRect();
        this.setCanvasSize(bb.width, bb.height);
    }

    addData({positions, sizes, colors, normals}: PointCloudData): RendererNode {
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
        this.pointsInMemory += node.numPoints;
        return node;
    }

    removeNode(node: RendererNode) {
        this.pointsInMemory -= node.numPoints;
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

        const aspect = this.canvas.clientWidth / Math.max(this.canvas.clientHeight, 1);
        this.camera.setAspectRatio(aspect);
    }

    render(nodes: Iterable<RendererNode> = this.nodes): RenderingStats {
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

        // update uniforms
        const uniforms = this.splatShader.uniformLocations;
        this.gl.uniform3fv(uniforms.eyePos, this.camera.eye);
        this.gl.uniformMatrix4fv(uniforms.projectionMatrix, false, this.camera.projectionMatrix);
        this.gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, this.camera.modelViewMatrix);
        this.gl.uniformMatrix4fv(uniforms.modelViewMatrixIT, false, this.camera.modelViewMatrixIT);

        this.gl.uniform1f(uniforms.sizeScale, this.options.sizeScale);
        this.gl.uniform1f(uniforms.splatDepthSizeRatio, this.options.splatDepthSizeRatio);
        this.gl.uniform1f(uniforms.splatDepthEpsilon, this.options.splatDepthEpsilon);

        this.gl.uniform1i(uniforms.enableLighting, this.light.enabled ? 1 : 0);
        this.gl.uniform3fv(uniforms.lightDirection, this.light.direction);
        this.gl.uniform1f(uniforms.lightAmbientIntensity, this.light.ambientIntensity);
        this.gl.uniform1f(uniforms.lightSpecularIntensity, this.light.specularIntensity);
        this.gl.uniform1f(uniforms.lightSpecularShininess, this.light.specularShininess);

        // quad vertices for instanced rendering
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.splatShader.quadVertexBuffer);
        this.gl.vertexAttribPointer(this.splatShader.attributeLocations.quadVertex, 3, this.gl.FLOAT, false, 0, 0);

        this.offscreenFramebuffer.bind();

        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        let drawStats: {nodesDrawn: number, pointsDrawn: number};
        if (this.options.highQuality) {
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

        this.stats = {...drawStats, pointsLoaded: this.pointsInMemory, nodesLoaded: this.nodes.size};
        return this.stats;
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

}
