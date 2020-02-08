import { PointCloudData } from '../data/point-cloud-data';
import { LevelOfDetail2 } from '../octree2/level-of-detail2';
import { LodNode } from '../octree2/lod-node';
import { OctreeNodeInfo } from '../octree2/octree-node';

export type SubgridCell = {positions: Array<number>, sizes: Array<number>, colors: Array<number>, normals: Array<number>, weights: Array<number>};

export class NodeSubgrid {

    grid: Array<SubgridCell>;

    constructor(public readonly resolution: number = 64) {
        this.grid = [];
        const length = resolution ** 3;
        for (let i = 0; i < length; i++) {
            this.grid[i] = {
                positions: [],
                sizes: [],
                colors: [],
                normals: [],
                weights: []
            }
        }
    }
    addToCell(cellIndex: number, data: PointCloudData, pointIndex: number, weight: number) {
        const cell = this.grid[cellIndex];
        cell.positions.push(data.positions[pointIndex * 3]);
        cell.positions.push(data.positions[pointIndex * 3 + 1]);
        cell.positions.push(data.positions[pointIndex * 3 + 2]);

        cell.sizes.push(data.sizes[pointIndex]);

        cell.colors.push(data.colors[pointIndex * 3]);
        cell.colors.push(data.colors[pointIndex * 3 + 1]);
        cell.colors.push(data.colors[pointIndex * 3 + 2]);

        cell.normals.push(data.normals[pointIndex * 3]);
        cell.normals.push(data.normals[pointIndex * 3 + 1]);
        cell.normals.push(data.normals[pointIndex * 3 + 2]);

        cell.weights.push(weight);
    }

    mergeByCell(ni: OctreeNodeInfo): LodNode {
        // merge every subgrid cell
        const mergedPos: Array<number> = [];
        const mergedSizes: Array<number> = [];
        const mergedColors: Array<number> = [];
        const mergedNormals: Array<number> = [];
        const mergedWeights: Array<number> = [];
        for (const cell of this.grid) {
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

    clear() {
        const length = this.resolution ** 3;
        for (let i = 0; i < length; i++) {
            if (this.grid[i].positions.length > 0) {
                this.grid[i].positions = [];
                this.grid[i].sizes = [];
                this.grid[i].colors = [];
                this.grid[i].normals = [];
                this.grid[i].weights = [];
            }
        }
    }

}
