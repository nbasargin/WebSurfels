import { BoundingSphere, RendererNode } from 'web-surfels';

export enum DynamicLodNodeState {
    CHILDREN_NEED_TO_BE_LOADED,
    CHILDREN_LOADING,
    CHILDREN_LOAD_ERROR,
    FULLY_LOADED,
    UNLOADED,
}

export interface DynamicLodNode {
    id: number;
    state: DynamicLodNodeState;
    boundingSphere: BoundingSphere;
    rendererNode: RendererNode;
    childIDs: Array<number>;
    children: Array<DynamicLodNode>;
    unloadCounter: number; // incremented every time this node is not rendered, so it can be removed later
}
