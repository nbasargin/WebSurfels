import { PointCloudData } from 'web-surfels/lib/data/point-cloud-data';
import { LodNode, WeightedLodNode } from 'web-surfels/lib/data/level-of-detail/lod-node';
import { OctreeLodBuilder } from 'web-surfels/lib/data/level-of-detail/octree-lod-builder/octree-lod-builder';
import { OrbitAnimationController } from 'web-surfels/lib/controllers/camera/orbit-animation-controller';
import { Renderer } from 'web-surfels/lib/renderer/renderer';
import { BinaryXHR } from 'web-surfels/lib/utils/binary-xhr';
import { BoundingBox } from 'web-surfels/lib/utils/bounding-geometry';
import { Timing } from 'web-surfels/lib/utils/timing';
import { DemoBase } from './demo-base';
import { PLYLoader } from '@loaders.gl/ply';
import { parse } from '@loaders.gl/core';

export class DragonInBrowserLodDemo implements DemoBase {

    preferredMovementSpeed = 0.1;

    private lodRoot: WeightedLodNode;
    private lodRootJitter: WeightedLodNode;

    levels: Array<number>;
    loading: boolean = true;

    // shown
    jitter: boolean = false;
    lodLevel: number = 0;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
        resolution: number = 16,
        maxDepth: number = 10,
    ) {
        this.renderer.camera.setOrientation([3, 3, 3], [0, 0, 0], [0, 1, 0]);

        this.orbitAnimation.minDistance = 0.25;
        this.orbitAnimation.maxDistance = 0.3;
        this.orbitAnimation.targetElevation = 0.1;
        this.orbitAnimation.cameraElevation = 0.2;
        this.orbitAnimation.rotationDuration = 25000 * this.preferredMovementSpeed;
        this.orbitAnimation.animate(3000);
        this.renderer.camera.setClippingDist(0.001, 1000);

        Timing.measure();
        const url = 'https://www.dl.dropboxusercontent.com/s/9inx5f1n5sm2cp8/stanford_dragon.ply?dl=1';
        BinaryXHR.get(url).then(buffer => {
            return parse(buffer, PLYLoader);
        }).then(rawData => {
            console.log(Timing.measure(), 'raw data received');

            const data: PointCloudData = {
                positions: rawData.attributes.POSITION.value,
                sizes: new Float32Array(Math.floor(rawData.attributes.POSITION.value.length / 3)).fill(0.0015),
                normals: rawData.attributes.NORMAL.value,
                colors: new Float32Array(rawData.attributes.COLOR_0.value).map(c => c / 255),
            };
            console.log(Timing.measure(), 'data preprocessed');

            const bb = BoundingBox.create(data.positions);
            const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
            octree.addData(data);
            console.log(Timing.measure(), 'octree created');

            const treeDepth = octree.root.getDepth();
            this.lodRoot = octree.buildLod(0);
            console.log(Timing.measure(), 'lod computed');

            // now with jitter
            octree.addData(data);
            this.lodRootJitter = octree.buildLod(1);
            console.log(Timing.measure(), 'octree + lod  with jitter');

            this.showLodLevel(3);
            this.loading = false;

            this.levels = [];
            for (let i = 0; i < treeDepth; i++) {
                this.levels.push(i);
            }
        });
    }

    showLodLevel(level: number, jitter = false) {
        this.lodLevel = level;
        this.jitter = jitter;
        this.renderer.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(jitter ? this.lodRootJitter : this.lodRoot, level);
        for (const node of nodes) {
            this.renderer.addData(node.data);
        }
    }

    private getNodesAtSpecificDepth(root: LodNode, depth: number): Array<LodNode> {
        if (depth <= 0 || root.children.length == 0) {
            return [root];
        } else {
            let nodes: Array<LodNode> = [];
            for (const child of root.children) {
                nodes = nodes.concat(this.getNodesAtSpecificDepth(child, depth - 1));
            }
            return nodes;
        }
    }

}
