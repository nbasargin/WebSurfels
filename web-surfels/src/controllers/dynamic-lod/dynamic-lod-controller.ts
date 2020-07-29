import { RenderingStats } from '../../renderer/rendering-stats';
import { DynamicLodNode, DynamicLodNodeState } from './dynamic-lod-node';
import { LodLoader } from '../../data/level-of-detail/lod-loader';
import { Renderer } from '../../renderer/renderer';
import { RendererNode } from '../../renderer/renderer-node';
import { LodNode } from '../../data/level-of-detail/lod-node';

type UnloadConfig = {
    strategy: 'never'
} | {
    strategy: 'nthFrame',
    nthFrame: number,
    unloadThreshold: number
}

export class DynamicLodController {

    stats: RenderingStats  = {
        pointsLoaded: 0,
        pointsDrawn: 0,
        nodesLoaded: 0,
        nodesDrawn: 0,
    };

    errorLoadingRoot = false;

    private root: DynamicLodNode;
    private frameCounter: number = 0;
    private destroyed: boolean = false;

    constructor(
        public renderer: Renderer,
        public loader: LodLoader,
        public sizeThreshold: number,
        public unloadConfig: UnloadConfig = {strategy: 'nthFrame', unloadThreshold: 200, nthFrame: 100}
    ) {
        this.loader.loadNode('root').then(rootLod => {
            this.root = this.addLodNode(rootLod);
        }).catch(error => {
            console.error('Could not load root node', error);
            this.errorLoadingRoot = true;
        });
    }

    render() {
        if (!this.root || this.destroyed) {
            return;
        }
        const renderList: Array<RendererNode> = [];
        const frontier: Array<DynamicLodNode> = [this.root];
        let frontierPosition: number = 0;
        let frontierSize: number = 1;

        while (frontierPosition < frontierSize) {
            const nextNode = frontier[frontierPosition];
            frontierPosition++;
            const s = nextNode.boundingSphere;

            if (!this.renderer.camera.isSphereInFrustum(s.centerX, s.centerY, s.centerZ, s.radius)) {
                nextNode.unloadChildrenCounter++;
                continue;
            }

            const projectedSize = this.renderer.camera.getProjectedSphereSize(s.centerX, s.centerY, s.centerZ, s.radius);
            if (projectedSize < this.sizeThreshold) {
                // node is small enough
                // render this LoD
                renderList.push(nextNode.rendererNode);
                nextNode.unloadChildrenCounter++;
                continue;
            }

            // node is too large, need better details
            nextNode.unloadChildrenCounter = 0;
            if (nextNode.children.length > 0) {
                // node has children, proceed with them
                frontier.push(...nextNode.children);
                frontierSize += nextNode.children.length;
            } else {
                // no children (yet) -> render this LoD
                renderList.push(nextNode.rendererNode);
                if (nextNode.state === DynamicLodNodeState.CHILDREN_NEED_TO_BE_LOADED) {
                    this.loadChildrenOf(nextNode).then();
                }
            }
        }

        this.stats = this.renderer.render(renderList);

        // unloading of frames
        this.frameCounter++;
        if (this.unloadConfig.strategy === 'nthFrame') {
            const n = this.unloadConfig.nthFrame;
            if (this.frameCounter % n === n - 1) {
                this.checkForUnload(this.root, this.unloadConfig.unloadThreshold);
            }
        }
    }

    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        if (this.root) {
            this.unloadChildrenOf(this.root);
            this.removeLodNode(this.root);
            this.root.state = DynamicLodNodeState.UNLOADED;
        }
    }

    private async loadChildrenOf(parent: DynamicLodNode) {
        if (parent.state !== DynamicLodNodeState.CHILDREN_NEED_TO_BE_LOADED) {
            return;
        }
        try {
            parent.state = DynamicLodNodeState.CHILDREN_LOADING;
            const promises2: Array<Promise<DynamicLodNode>> = [];
            for (const childID of parent.childIDs) {
                const lodNodePromise = this.loader.loadNode(childID);
                const dynamicNodePromise = lodNodePromise.then(lodNode => {
                    if (this.destroyed) {
                        return null as any as DynamicLodNode; // do not add data to renderer when already destroyed
                    }
                    return this.addLodNode(lodNode);
                });
                promises2.push(dynamicNodePromise);
            }

            const dynamicChildLods = await Promise.all(promises2);
            if (this.destroyed) {
                return;
            }
            if (parent.state !== DynamicLodNodeState.CHILDREN_LOADING) {
                // discard children if loading was cancelled (e.g. node was unloaded)
                for (const childLod of dynamicChildLods) {
                    this.removeLodNode(childLod);
                }
                return;
            }
            parent.children = dynamicChildLods;
            parent.state = DynamicLodNodeState.FULLY_LOADED;
        } catch (error) {
            parent.state = DynamicLodNodeState.CHILDREN_LOAD_ERROR;
            console.error('Could not load children of node', parent.id, error);
        }
    }

    private unloadChildrenOf(parent: DynamicLodNode) {
        if (parent.state === DynamicLodNodeState.CHILDREN_LOADING) {
            return; // no children to unload yet
        }

        for (const child of parent.children) {
            this.unloadChildrenOf(child);
            this.removeLodNode(child);
            child.state = DynamicLodNodeState.UNLOADED;
        }
        parent.state = parent.childIDs.length > 0 ? DynamicLodNodeState.CHILDREN_NEED_TO_BE_LOADED : DynamicLodNodeState.FULLY_LOADED;
        parent.children = [];
    }

    // does not care about children
    private addLodNode(node: LodNode): DynamicLodNode {
        const rendererNode = this.renderer.addData(node.data);
        return {
            id: node.id,
            boundingSphere: node.boundingSphere,
            rendererNode: rendererNode,
            childIDs: node.childIDs,
            children: [],
            unloadChildrenCounter: 0,
            state: node.childIDs.length > 0 ? DynamicLodNodeState.CHILDREN_NEED_TO_BE_LOADED : DynamicLodNodeState.FULLY_LOADED,
        }
    }

    // does not care about children
    private removeLodNode(node: DynamicLodNode) {
        this.renderer.removeNode(node.rendererNode);
    }

    private checkForUnload(node: DynamicLodNode, unloadThreshold: number) {
        if (node.unloadChildrenCounter > unloadThreshold) {
            // unload children of this node recursively
            this.unloadChildrenOf(node);
            node.unloadChildrenCounter = 0;
            return;
        }
        for (const child of node.children) {
            this.checkForUnload(child, unloadThreshold - node.unloadChildrenCounter);
        }
    }

}
