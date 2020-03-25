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
    unloadChildrenCounter: number; // incremented every time all children are not rendered, so they can be removed later
}
