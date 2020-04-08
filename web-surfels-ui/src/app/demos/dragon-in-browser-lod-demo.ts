import { vec3 } from 'gl-matrix';
import { StanfordDragonLoader } from '../../lib/data/stanford-dragon-loader';
import { LodNode, WeightedLodNode } from '../../lib/level-of-detail/lod-node';
import { OctreeLodBuilder } from '../../lib/level-of-detail/octree-lod-buider/octree-lod-builder';
import { Renderer } from '../../lib/renderer/renderer';
import { Geometry } from '../../lib/utils/geometry';
import { Timing } from '../../lib/utils/timing';

export class DragonInBrowserLodDemo {

    private lodRoot: WeightedLodNode;

    levels: Array<number>;
    loading: boolean = true;

    constructor(
        public renderer: Renderer,
        resolution: number,
        maxDepth: number
    ) {
        this.renderer.camera.setOrientation(vec3.fromValues(3,3,3), vec3.fromValues(0,0,0), vec3.fromValues(0,1,0));

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
