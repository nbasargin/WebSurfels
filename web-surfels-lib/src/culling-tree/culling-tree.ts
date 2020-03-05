import { LodNode } from '../level-of-detail/lod-node';
import { RendererNode } from '../renderer2/renderer-node';
import { Renderer2 } from '../renderer2/renderer2';
import { CullingNode } from './culling-node';

export class CullingTree {

    private readonly root: CullingNode;

    /**
     * Create a culling tree from a level of detail tree.
     * The culling tree automatically selects the appropriate level of detail and culls nodes outside of frustum.
     *
     * @param renderer
     * @param sizeThreshold  percentage of screen height, nodes below this are rendered and not expanded
     * @param lodNode
     */
    constructor(public renderer: Renderer2, public sizeThreshold: number, lodNode: LodNode) {
        this.root = this.addLodNode(renderer, lodNode);
    }

    addLodNode(renderer: Renderer2, lodNode: LodNode): CullingNode {
        const data = lodNode.data;
        const rendererNode = renderer.addData(data.positions, data.sizes, data.colors, data.normals);
        const children: Array<CullingNode> = [];
        for (const child of lodNode.children) {
            children.push(this.addLodNode(renderer, child));
        }
        return {
            boundingSphere: lodNode.boundingSphere,
            children,
            rendererNode
        }
    }

    render(disableSplatting: boolean = false): {nodesDrawn: number, pointsDrawn: number} {
        const renderList: Array<RendererNode> = [];
        const frontier: Array<CullingNode> = [this.root];
        let frontierPosition: number = 0;
        let frontierSize: number = 1;

        while (frontierPosition < frontierSize) {

            const nextNode = frontier[frontierPosition];
            frontierPosition++;

            const s = nextNode.boundingSphere;
            if (this.renderer.frustum.isSphereInFrustum(s.centerX, s.centerY, s.centerZ, s.radius)) {
                const projectedSize = this.renderer.frustum.getProjectedSphereSize(s.centerX, s.centerY, s.centerZ, s.radius);
                if (projectedSize < this.sizeThreshold || nextNode.children.length === 0) {
                    // render this LoD
                    renderList.push(nextNode.rendererNode);
                } else {
                    // node is too large, proceed with children
                    frontier.push(...nextNode.children);
                    frontierSize += nextNode.children.length;
                }
            }
        }

        return this.renderer.render(renderList, disableSplatting);
    }


}
