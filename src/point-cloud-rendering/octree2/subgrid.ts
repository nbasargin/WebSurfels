import { WeightedPointCloudData } from '../data/point-cloud-data';
import { Geometry } from '../utils/geometry';
import { LodNode } from './lod-node';
import { OctreeNodeInfo } from './octree-node';

export class Subgrid {

    public static getCellIndex(pos, min, size, resolution) {
        const index = Math.floor((pos - min) / size * resolution);
        return Math.max(0, Math.min(resolution - 1, index));
    }

    // adds some randomness to indices (points could move to adjacent cells)
    public static getRandomizedCellIndex(pos, min, size, resolution, randomness) {
        const index = Math.floor((pos - min) / size * resolution  + (Math.random() - 0.5) * randomness);
        return Math.max(0, Math.min(resolution - 1, index));
    }

    private readonly indexGrid: Int32Array;

    constructor(public readonly resolution: number = 64) {
        this.indexGrid = new Int32Array(resolution ** 3);
    }

    mergeLoD(childLoDs: Array<LodNode>, nodeInfo: OctreeNodeInfo, indexRandomness: number = 0): LodNode {
        this.indexGrid.fill(-1);
        const mergedLoD = Geometry.mergeLoD(childLoDs);
        const pos = mergedLoD.positions;

        const minX = nodeInfo.centerX - nodeInfo.size / 2;
        const minY = nodeInfo.centerY - nodeInfo.size / 2;
        const minZ = nodeInfo.centerZ - nodeInfo.size / 2;
        const pointCount = pos.length / 3;

        // sort every point into the grid and build the point chains
        const indexChains = new Int32Array(pointCount);
        let occupiedCells = 0;
        for (let i = 0; i < pointCount; i++) {
            let px: number, py: number, pz: number;
            if (indexRandomness === 0) {
                px = Subgrid.getCellIndex(pos[i * 3], minX, nodeInfo.size, nodeInfo.resolution);
                py = Subgrid.getCellIndex(pos[i * 3 + 1], minY, nodeInfo.size, nodeInfo.resolution);
                pz = Subgrid.getCellIndex(pos[i * 3 + 2], minZ, nodeInfo.size, nodeInfo.resolution);
            } else {
                px = Subgrid.getRandomizedCellIndex(pos[i * 3], minX, nodeInfo.size, nodeInfo.resolution, indexRandomness);
                py = Subgrid.getRandomizedCellIndex(pos[i * 3 + 1], minY, nodeInfo.size, nodeInfo.resolution, indexRandomness);
                pz = Subgrid.getRandomizedCellIndex(pos[i * 3 + 2], minZ, nodeInfo.size, nodeInfo.resolution, indexRandomness);
            }
            const subcellIndex = px + py * nodeInfo.resolution + (pz * nodeInfo.resolution ** 2);

            const prevPoint = this.indexGrid[subcellIndex];
            this.indexGrid[subcellIndex] = i;
            if (prevPoint === -1) {
                occupiedCells++;
            }
            indexChains[i] = prevPoint;
        }

        // create output
        const result: LodNode = {
            nodeInfo: nodeInfo,
            positions: new Float32Array(occupiedCells * 3),
            sizes: new Float32Array(occupiedCells),
            colors: new Float32Array(occupiedCells * 3),
            normals: new Float32Array(occupiedCells * 3),
            weights: new Float32Array(occupiedCells),
            children: childLoDs,
        };
        let writePos = 0;
        for (let i = 0; i < this.indexGrid.length; i++) {
            let nextPointIndex = this.indexGrid[i];
            const pointIndices: Array<number> = [];
            while (nextPointIndex !== -1) {
                pointIndices.push(nextPointIndex);
                nextPointIndex = indexChains[nextPointIndex];
            }
            if (pointIndices.length > 0) {
                Subgrid.mergePoints(mergedLoD, pointIndices, nodeInfo, result, writePos);
                writePos++;
            }
        }

        if (writePos != occupiedCells) {
            console.error('write position and number of occupied cells do not match!');
        }

        return result;
    }

    // merging points in a single cell
    private static mergePoints(input: WeightedPointCloudData, inputIndices: Array<number>, nodeInfo: OctreeNodeInfo, output: WeightedPointCloudData, outputIndex: number): void {

        let x = 0, y = 0, z = 0;
        let r = 0, g = 0, b = 0;
        let nx = 0, ny = 0, nz = 0;
        let squaredSizeSum = 0;
        let weightSum = 0;

        const numPoints = inputIndices.length;
        for (const i of inputIndices) {
            const weight = input.weights[i];
            const size = input.sizes[i];
            weightSum += weight;
            squaredSizeSum += size * size;

            x += input.positions[i * 3] * weight;
            y += input.positions[i * 3 + 1] * weight;
            z += input.positions[i * 3 + 2] * weight;

            r += input.colors[i * 3] * weight;
            g += input.colors[i * 3 + 1] * weight;
            b += input.colors[i * 3 + 2] * weight;

            nx += input.normals[i * 3] * weight;
            ny += input.normals[i * 3 + 1] * weight;
            nz += input.normals[i * 3 + 2] * weight;
        }

        x /= weightSum;
        y /= weightSum;
        z /= weightSum;

        r /= weightSum;
        g /= weightSum;
        b /= weightSum;

        const normalLength = Math.sqrt(nx * nx + ny * ny + nz * nz);
        nx /= normalLength;
        ny /= normalLength;
        nz /= normalLength;

        let constAreaSize = Math.sqrt(squaredSizeSum); // size resulting from keeping the total splat area constant

        // compute size of bounding sphere with position average as center
        let maxRadius = 0;
        for (let i = 0; i < numPoints; i++) {
            const dx = x - input.positions[i * 3];
            const dy = y - input.positions[i * 3 + 1];
            const dz = z - input.positions[i * 3 + 2];
            const radius = Math.sqrt(dx * dx + dy * dy + dz * dz) + input.sizes[i];
            maxRadius = Math.max(maxRadius, radius);
        }

        const cellSize = nodeInfo.size / nodeInfo.resolution * Math.sqrt(3);
        const size = Math.min(constAreaSize, maxRadius * Math.sqrt(2), cellSize);

        // write output
        output.positions[outputIndex * 3] = x;
        output.positions[outputIndex * 3 + 1] = y;
        output.positions[outputIndex * 3 + 2] = z;

        output.sizes[outputIndex] = size;

        output.colors[outputIndex * 3] = r;
        output.colors[outputIndex * 3 + 1] = g;
        output.colors[outputIndex * 3 + 2] = b;

        output.normals[outputIndex * 3] = nx;
        output.normals[outputIndex * 3 + 1] = ny;
        output.normals[outputIndex * 3 + 2] = nz;

        output.weights[outputIndex] = weightSum;
    }

}