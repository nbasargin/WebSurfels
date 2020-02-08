import { PointCloudData } from '../data/point-cloud-data';
import { Bitfield } from '../octree/bitfield';
import { NodeSubgrid } from '../octree/node-subgrid';
import { LevelOfDetail2 } from './level-of-detail2';
import { LodNode } from './lod-node';
import { OctreeNode, OctreeNodeInfo } from './octree-node';

/**
 * A leaf node that stores points.
 *
 * If depth limit is not reached, the leaf can be expanded into an inner node.
 * Expansion is needed when more than one point falls into the same sub-cell.
 * A bit field tracks what sub-cells are already occupied.
 */
export class LeafNode implements OctreeNode {

    private readonly occupied: Bitfield;
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

        this.minX = this.nodeInfo.centerX - this.nodeInfo.size / 2;
        this.minY = this.nodeInfo.centerY - this.nodeInfo.size / 2;
        this.minZ = this.nodeInfo.centerZ - this.nodeInfo.size / 2;

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

            const x = LevelOfDetail2.getCellIndex(pointIndex * 3, this.minX, this.nodeInfo.size, r);
            const y = LevelOfDetail2.getCellIndex(pointIndex * 3 + 1, this.minY, this.nodeInfo.size, r);
            const z = LevelOfDetail2.getCellIndex(pointIndex * 3 + 2, this.minZ, this.nodeInfo.size, r);
            const subCellIndex = x + y * r + z * r * r;

            if (x >= r || y >= r || z >= r) {
                console.log('LeafNode, invalid index', x, y, z);
                console.log('LeafNode, x without floor', (data.positions[pointIndex] - this.minX) / this.nodeInfo.size * r);
                console.log('LeafNode, x without floor', (data.positions[pointIndex + 1] - this.minY) / this.nodeInfo.size * r);
                console.log('LeafNode, x without floor', (data.positions[pointIndex + 2] - this.minZ) / this.nodeInfo.size * r);
            }
            if (x < 0 || y < 0 || z < 0) {
                console.log('invalid index', x, y, z)
            }


            if (this.occupied.getBit(subCellIndex)) {
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

    computeLOD(subgrid: NodeSubgrid): LodNode {
        // todo: do more efficient conversion if node could have been split but is not
        // in that case, every subcell is guaranteed to contain at most one point

        const ni = this.nodeInfo;
        if (subgrid.resolution !== ni.resolution) {
            subgrid = new NodeSubgrid(ni.resolution);
        } else {
            subgrid.clear();
        }

        // sort all the points into subgrid
        for (let i = 0; i < this.pointCount; i++) {
            // based on position, determine cell
            const px = LevelOfDetail2.getCellIndex(this.positions[i * 3], this.minX, ni.size, ni.resolution);
            const py = LevelOfDetail2.getCellIndex(this.positions[i * 3 + 1], this.minY, ni.size, ni.resolution);
            const pz = LevelOfDetail2.getCellIndex(this.positions[i * 3 + 2], this.minZ, ni.size, ni.resolution);
            const subcellIndex = px + py * ni.resolution + (pz * ni.resolution ** 2);

            if (px < 0 || py < 0 || pz < 0) {
                console.log('invalid index', px, py, pz)
            }
            if (px >= ni.resolution || py >= ni.resolution || pz >= ni.resolution) {
                console.log('invalid index', px, py, pz);
            }

            // put point into cell
            const cell = subgrid.grid[subcellIndex];
            cell.positions.push(this.positions[i * 3]);
            cell.positions.push(this.positions[i * 3 + 1]);
            cell.positions.push(this.positions[i * 3 + 2]);

            cell.sizes.push(this.sizes[i]);

            cell.colors.push(this.colors[i * 3]);
            cell.colors.push(this.colors[i * 3 + 1]);
            cell.colors.push(this.colors[i * 3 + 2]);

            cell.normals.push(this.normals[i * 3]);
            cell.normals.push(this.normals[i * 3 + 1]);
            cell.normals.push(this.normals[i * 3 + 2]);

            cell.weights.push(1);
        }

        // merge every subgrid cell
        const mergedPos: Array<number> = [];
        const mergedSizes: Array<number> = [];
        const mergedColors: Array<number> = [];
        const mergedNormals: Array<number> = [];
        const mergedWeights: Array<number> = [];
        for (const cell of subgrid.grid) {
            if (cell.positions.length === 0) {
                continue;
            }
            const {x, y, z, r, g, b, nx, ny, nz, size, weight} = LevelOfDetail2.subcellToPoint(cell);
            mergedPos.push(x, y, z);
            mergedSizes.push(size);
            mergedColors.push(r, g, b);
            mergedNormals.push(nx, ny, nz);
            mergedWeights.push(weight);
        }

        return {
            nodeInfo: ni,
            positions: new Float32Array(mergedPos),
            sizes: new Float32Array(mergedSizes),
            colors: new Float32Array(mergedColors),
            normals: new Float32Array(mergedNormals),
            weights: new Float32Array(mergedWeights),
            children: []
        };
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

    debugHierarchy(): string {
        return this.pointCount + (this.maxDepth > 1 ? '+' : '');
    }

}
