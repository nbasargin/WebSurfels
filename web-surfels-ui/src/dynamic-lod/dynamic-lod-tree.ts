import { LodNode, Renderer2 } from 'web-surfels';
import { DynamicLodNode, DynamicLodNodeState } from './dynamic-lod-node';
import { LodLoader } from './lod-loader';

export class DynamicLodTree {

    //private loadedNodes: Map<number, DynamicLodNode> = new Map();
    private stats = {
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

    private async loadChildrenOf(parent: DynamicLodNode) {
        if (parent.state !== DynamicLodNodeState.CHILDREN_MISSING) {
            return;
        }
        try {
            parent.state = DynamicLodNodeState.CHILDREN_LOADING;
            const promises = parent.childIDs.map(id => this.loader.loadNode(id));
            const childLods = await Promise.all(promises);
            if (parent.state !== DynamicLodNodeState.CHILDREN_LOADING) {
                return; // discard children if loading was cancelled (e.g. node was unloaded)
            }
            parent.children = childLods.map(childLod => this.addLodNode(childLod));
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
            state: node.childIDs.length > 0 ? DynamicLodNodeState.CHILDREN_MISSING : DynamicLodNodeState.FULLY_LOADED,
        }
    }

    private unloadHiddenNodes() {
        // todo: unload nodes that were scheduled to be unloaded a few times
        // never unload the root;
    }


}
