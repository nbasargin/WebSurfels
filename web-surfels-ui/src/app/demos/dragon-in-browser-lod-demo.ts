import { vec3 } from 'gl-matrix';
import { StanfordDragonLoader } from '../../lib/data/stanford-dragon-loader';
import { LodNode, WeightedLodNode } from '../../lib/level-of-detail/lod-node';
import { OctreeLodBuilder } from '../../lib/level-of-detail/octree-lod-buider/octree-lod-builder';
import { OrbitAnimationController } from '../../lib/renderer/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { Geometry } from '../../lib/utils/geometry';
import { Timing } from '../../lib/utils/timing';
import { DemoBase } from './demo-base';

export class DragonInBrowserLodDemo implements DemoBase {

    preferredMovementSpeed = 1;

    private lodRoot: WeightedLodNode;

    levels: Array<number>;
    loading: boolean = true;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
        resolution: number = 32,
        maxDepth: number = 10,
    ) {
        this.renderer.camera.setOrientation(vec3.fromValues(3, 3, 3), vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));

        this.orbitAnimation.minDistance = 2;
        this.orbitAnimation.maxDistance = 4;
        this.orbitAnimation.elevation = 2;
        this.orbitAnimation.rotationDuration = 25000;
        this.orbitAnimation.animate(3000);

        Timing.measure();
        const dragonLoader = new StanfordDragonLoader();
        dragonLoader.loadDropbox().then(data => {
            console.log(Timing.measure(), 'data loaded');

            const bb = Geometry.getBoundingBox(data.positions);
            const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
            octree.addData(data);
            console.log(Timing.measure(), 'octree created');

            const treeDepth = octree.root.getDepth();
            this.lodRoot = octree.buildLod();
            console.log(Timing.measure(), 'lod computed');
            this.showLodLevel(0);
            this.loading = false;

            this.levels = [];
            for (let i = 0; i < treeDepth; i++) {
                this.levels.push(i);
            }

        });
    }

    showLodLevel(level: number) {
        this.renderer.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(this.lodRoot, level);
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
