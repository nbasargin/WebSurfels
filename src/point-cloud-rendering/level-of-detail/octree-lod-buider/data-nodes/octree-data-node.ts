import { PointCloudData } from '../../../data/point-cloud-data';
import { LodTree } from '../../lod-tree';
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
    computeLOD(subgrid: Subgrid): LodTree;

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
