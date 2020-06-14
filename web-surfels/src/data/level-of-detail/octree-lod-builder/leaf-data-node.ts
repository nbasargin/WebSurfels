import { PointCloudData } from '../../point-cloud-data';
import { UidGenerator } from '../../../utils/uid-generator';
import { WeightedLodNode } from '../lod-node';
import { BoundingSphere } from '../../../utils/bounding-geometry';
import { Bitfield } from '../../../utils/bitfield';
import { Subgrid } from '../subgrid';
import { OctreeDataNode, OctreeNodeInfo } from './octree-data-node';

/**
 * A leaf node that stores points.
 *
 * If depth limit is not reached, the leaf can be expanded into an inner node.
 * Expansion is needed when more than one point falls into the same sub-cell.
 * A bit field tracks what sub-cells are already occupied.
 * Nodes can only expand when a certain minimal number of points is collected.
 */
export class LeafDataNode implements OctreeDataNode {

    private readonly occupied: Bitfield;
    private splitNeeded: boolean = false;  // at least one cell has a collision (two or mor points inside)
    private splitThreshold: number;
    readonly minX: number;
    readonly minY: number;
    readonly minZ: number;

    private capacity: number;
    pointCount: number = 0;

    positions: Float32Array;
    sizes: Float32Array;
    colors: Float32Array;
    normals: Float32Array;

    constructor(
        public readonly nodeInfo: OctreeNodeInfo,
        public readonly maxDepth: number
    ) {
        if (maxDepth > 1) {
            // node can be split
            this.occupied = new Bitfield(nodeInfo.resolution ** 3);
        }

        this.splitThreshold = 4 * nodeInfo.resolution ** 2;

        this.minX = nodeInfo.centerX - nodeInfo.size / 2;
        this.minY = nodeInfo.centerY - nodeInfo.size / 2;
        this.minZ = nodeInfo.centerZ - nodeInfo.size / 2;

        this.capacity = nodeInfo.resolution; // initial capacity

        this.positions = new Float32Array(this.capacity * 3);
        this.sizes = new Float32Array(this.capacity);
        this.colors = new Float32Array(this.capacity * 3);
        this.normals = new Float32Array(this.capacity * 3);
    }

    addPoint(data: PointCloudData, pointIndex: number): boolean {
        if (this.maxDepth > 1) {
            // node is splittable
            const r = this.nodeInfo.resolution;

            const x = Subgrid.getCellIndex(pointIndex * 3, this.minX, this.nodeInfo.size, r);
            const y = Subgrid.getCellIndex(pointIndex * 3 + 1, this.minY, this.nodeInfo.size, r);
            const z = Subgrid.getCellIndex(pointIndex * 3 + 2, this.minZ, this.nodeInfo.size, r);
            const subCellIndex = x + y * r + z * r * r;

            if (x >= r || y >= r || z >= r) {
                console.log('LeafNode, invalid index', x, y, z);
            }
            if (x < 0 || y < 0 || z < 0) {
                console.log('invalid index', x, y, z)
            }
            if (!this.splitNeeded && this.occupied.getBit(subCellIndex)) {
                this.splitNeeded = true;
            }
            if (this.splitNeeded && this.pointCount > this.splitThreshold) {
                return false;
            }
            this.occupied.setBit(subCellIndex);
        }

        if (this.pointCount === this.capacity) {
            this.doubleCapacity();
        }
        this.copyPoint(data, pointIndex, this.pointCount);
        this.pointCount++;
        return true;
    }

    computeLOD(subgrid: Subgrid): WeightedLodNode {
        // no need to compute LOD (leaf nodes have all points in different subcells or there are not enough points)
        const positions = this.positions.slice(0, this.pointCount * 3);
        const sizes = this.sizes.slice(0, this.pointCount);
        const colors = this.colors.slice(0, this.pointCount * 3);
        const normals = this.normals.slice(0, this.pointCount * 3);
        const weights = new Float32Array(this.pointCount);
        weights.fill(1);
        const boundingSphere = BoundingSphere.create(positions, sizes);
        const id = UidGenerator.genUID();
        const data: PointCloudData = {positions, sizes, colors, normals};

        // free memory
        this.capacity = 0;
        this.positions = new Float32Array(0);
        this.sizes = new Float32Array(0);
        this.colors = new Float32Array(0);
        this.normals = new Float32Array(0);

        return {id, boundingSphere, data, childIDs: [], children: [], weights}
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
            this.positions[toIndex * 3 + i] = fromData.positions[fromIndex * 3 + i];
            this.colors[toIndex * 3 + i] = fromData.colors[fromIndex * 3 + i];
            this.normals[toIndex * 3 + i] = fromData.normals[fromIndex * 3 + i];
        }
        this.sizes[toIndex] = fromData.sizes[fromIndex];
    }

    getNumberOfNodes(): number {
        return 1;
    }

    getDepth(): number {
        return 1;
    }

}
