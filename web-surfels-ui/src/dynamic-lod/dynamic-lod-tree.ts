import { LodNode, Renderer2 } from 'web-surfels';
import { RendererNode } from 'web-surfels';
import { DynamicLodNode, DynamicLodNodeState } from './dynamic-lod-node';
import { LodLoader } from './lod-loader';

export class DynamicLodTree {

    readonly stats = {
        loadedNodes: 0,
        loadedPoints: 0,
        renderedNodes: 0,
        renderedPoints: 0,
    };

    private root: DynamicLodNode;

    constructor(
        public renderer: Renderer2,
        public loader: LodLoader,
        public sizeThreshold: number,
    ) {
        this.loader.loadNode('root').then(rootLod => {
            this.root = this.addLodNode(rootLod);
        }).catch(error => {
            console.error('Could not load root node', error);
        });
    }

    render(disableSplatting: boolean = false) {
        if (!this.root) {
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

            if (!this.renderer.frustum.isSphereInFrustum(s.centerX, s.centerY, s.centerZ, s.radius)) {
                nextNode.unloadCounter++;
                continue;
            }

            const projectedSize = this.renderer.frustum.getProjectedSphereSize(s.centerX, s.centerY, s.centerZ, s.radius);
            if (projectedSize < this.sizeThreshold) {
                // node is small enough
                // render this LoD
                renderList.push(nextNode.rendererNode);
                // mark children to be unloaded (if there are any)
                for (const child of nextNode.children) {
                    child.unloadCounter++;
                }
                continue;
            }

            // node is too large, need better details
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

        const {nodesDrawn, pointsDrawn} = this.renderer.render(renderList, disableSplatting);
        this.stats.renderedNodes = nodesDrawn;
        this.stats.renderedPoints = pointsDrawn;
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
                    return this.addLodNode(lodNode);
                });
                promises2.push(dynamicNodePromise);
            }

            const dynamicChildLods = await Promise.all(promises2);
            if (parent.state !== DynamicLodNodeState.CHILDREN_LOADING) {
                // discard children if loading was cancelled (e.g. node was unloaded)
                // if we do not allow to unload parent while children are loading this could be simplified
                for (const childLod of dynamicChildLods) {
                    this.renderer.removeNode(childLod.rendererNode);
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

    private addLodNode(node: LodNode): DynamicLodNode {
        const rendererNode = this.renderer.addData(node.data.positions, node.data.sizes, node.data.colors, node.data.normals);
        this.stats.loadedNodes++;
        this.stats.loadedPoints += node.data.positions.length / 3;
        return  {
            id: node.id,
            boundingSphere: node.boundingSphere,
            rendererNode: rendererNode,
            childIDs: node.childIDs,
            children: [],
            unloadCounter: 0,
            state: node.childIDs.length > 0 ? DynamicLodNodeState.CHILDREN_NEED_TO_BE_LOADED : DynamicLodNodeState.FULLY_LOADED,
        }
    }

    private unloadHiddenNodes() {
        // todo: unload nodes that were scheduled to be unloaded a few times
        // never unload the root;
    }


}
