import { PointCloudData } from '../../point-cloud-data';
import { WeightedLodNode } from '../lod-node';
import { Subgrid } from '../subgrid';

/**
 * Octree node that allows adding new points to grow the tree.
 */
export interface OctreeDataNode {

    nodeInfo: OctreeNodeInfo;

    addPoint(data: PointCloudData, pointIndex: number): boolean;

    /**
     * Computing lod will remove all added data to free memory.
     * @param subgrid
     */
    computeLOD(subgrid: Subgrid): WeightedLodNode;

    getNumberOfNodes(): number;

    getDepth(): number;

}

export interface OctreeNodeInfo {
    centerX: number;
    centerY: number;
    centerZ: number;
    size: number;
    resolution: number;
}
