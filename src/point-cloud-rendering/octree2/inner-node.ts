import { PointCloudData } from '../data/point-cloud-data';
import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * Inner octree node. Does not store any points but has children.
 */
export class InnerNode implements OctreeNode {

    constructor(
        public readonly nodeInfo: OctreeNodeInfo,
        public readonly children: Array<OctreeNode>,
    ) {
    }

    addPoint(data: PointCloudData, pointIndex: number) {
    }

    computeLOD(): LodNode {
        return undefined as any;
    }

}
