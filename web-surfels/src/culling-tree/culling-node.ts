import { RendererNode } from '../renderer2/renderer-node';
import { BoundingSphere } from '../utils/geometry';

export interface CullingNode {

    boundingSphere: BoundingSphere;
    rendererNode: RendererNode;
    children: Array<CullingNode>;

}
