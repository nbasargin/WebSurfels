import { PointCloudData } from '../data/point-cloud-data';
import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * Non-expandable leaf node. Accepts all inserted points.
 */
export class FinalLeafNode implements OctreeNode, PointCloudData {

    private capacity: number;
    private pointCount: number;

    // arrays to store currently inserted points
    positions: Float32Array;
    sizes: Float32Array;
    colors: Float32Array;
    normals: Float32Array;

    constructor(
        public readonly nodeInfo: OctreeNodeInfo
    ) {
        this.capacity = nodeInfo.resolution; // initial capacity

        this.positions = new Float32Array(this.capacity * 3);
        this.sizes = new Float32Array(this.capacity);
        this.colors = new Float32Array(this.capacity * 3);
        this.normals = new Float32Array(this.capacity * 3);
    }

    addPoint(data: PointCloudData, pointIndex: number) {
        if (this.pointCount === this.capacity) {
            this.doubleCapacity();
        }
        this.copyPoint(data, pointIndex, this.pointCount);
        this.pointCount++;
    }

    computeLOD(): LodNode {
        return undefined as any;
    }

    private doubleCapacity() {
        this.capacity *= 2;

        // resize buffers
        const positions = new Float32Array(this.capacity * 3);
        const sizes = new Float32Array(this.capacity);
        const colors = new Float32Array(this.capacity * 3);
        const normals = new Float32Array(this.capacity * 3);

        positions.set(this.positions);
        sizes.set(this.sizes);
        colors.set(this.colors);
        normals.set(this.normals);

        this.positions = positions;
        this.sizes = sizes;
        this.colors = colors;
        this.normals = normals;
    }

    private copyPoint(fromData: PointCloudData, fromIndex: number, toIndex: number) {
        for (let i = 0; i < 3; i++) {
            this.positions[toIndex + i] = fromData.positions[fromIndex + i];
            this.colors[toIndex + i] = fromData.colors[fromIndex + i];
            this.normals[toIndex + i] = fromData.normals[fromIndex + i];
        }
        this.sizes[toIndex] = fromData.sizes[fromIndex];
    }

}
