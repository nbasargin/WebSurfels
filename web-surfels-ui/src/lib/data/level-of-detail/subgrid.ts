import { WeightedPointCloudData } from '../point-cloud-data';
import { BoundingCube } from '../../utils/bounding-geometry';

type SubgridOutputBuffer = {
    positions: Array<number>;
    sizes: Array<number>;
    colors: Array<number>;
    normals: Array<number>;
    weights: Array<number>;
};

/**
 * Represents a grid of sub-cells that can be fitted into an arbitrary cube volume like an octree node.
 * Subgrid allows to merge close points and generate LoD representations. 
 */
export class Subgrid {

    private readonly indexGrid: Int32Array;

    /**
     * @param resolution  number of sub-cells along one axis
     * @param jitter  affects randomness during point reduction (points could move to adjacent cells)
     */
    constructor(
        public readonly resolution: number = 64,
        public readonly jitter: number = 0,
    ) {
        this.indexGrid = new Int32Array(resolution ** 3);
    }

    reduce(data: WeightedPointCloudData, boundingCube: BoundingCube): WeightedPointCloudData {
        // clear internal state
        this.indexGrid.fill(-1);
        const outputBuffer: SubgridOutputBuffer = {
            positions: [],
            sizes: [],
            colors: [],
            normals: [],
            weights: [],
        };

        const pos = data.positions;
        const {minX, minY, minZ, size} = boundingCube;
        const pointCount = pos.length / 3;
        const cellSize = size / this.resolution;

        // point chain: store points in a cell as a chain
        // the indexGrid stores id of the first point, every point stores id of the next point
        const indexChains = new Int32Array(pointCount);
        for (let i = 0; i < pointCount; i++) {
            const px = Subgrid.getCellIndex(pos[i * 3], minX, size, this.resolution, this.jitter);
            const py = Subgrid.getCellIndex(pos[i * 3 + 1], minY, size, this.resolution, this.jitter);
            const pz = Subgrid.getCellIndex(pos[i * 3 + 2], minZ, size, this.resolution, this.jitter);
            const subcellIndex = px + py * this.resolution + (pz * this.resolution ** 2);
            indexChains[i] = this.indexGrid[subcellIndex];
            this.indexGrid[subcellIndex] = i;
        }

        // merge points in cells
        for (let i = 0; i < this.indexGrid.length; i++) {
            let nextPointIndex = this.indexGrid[i];
            const pointIndices: Array<number> = [];
            while (nextPointIndex !== -1) {
                pointIndices.push(nextPointIndex);
                nextPointIndex = indexChains[nextPointIndex];
            }
            if (pointIndices.length > 0) {
                Subgrid.reduceCell(data, pointIndices, cellSize, outputBuffer);
            }
        }

        return {
            positions: new Float32Array(outputBuffer.positions),
            sizes: new Float32Array(outputBuffer.sizes),
            colors: new Float32Array(outputBuffer.colors),
            normals: new Float32Array(outputBuffer.normals),
            weights: new Float32Array(outputBuffer.weights),
        };
    }

    /**
     * Reduce all points assigned to a cell. Output is appended to the outputBuffer.
     */
    private static reduceCell(input: WeightedPointCloudData, inputIndices: Array<number>, cellSize: number, outputBuffer: SubgridOutputBuffer) {
        let x = 0, y = 0, z = 0;
        let r = 0, g = 0, b = 0;
        let nx = 0, ny = 0, nz = 0;
        let squaredSizeSum = 0;
        let weightSum = 0;
        let minSize = Number.POSITIVE_INFINITY;

        const numPoints = inputIndices.length;
        for (const i of inputIndices) {
            const weight = input.weights[i];
            const size = input.sizes[i];
            weightSum += weight;
            squaredSizeSum += size * size;
            minSize = Math.min(minSize, size);

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

        const normalLength = Math.max(0.0001, Math.sqrt(nx * nx + ny * ny + nz * nz));

        let constAreaSize = Math.sqrt(squaredSizeSum); // size resulting from keeping the total splat area constant
        // compute size of bounding sphere with position average as center
        let maxRadius = 0;
        for (let i = 0; i < numPoints; i++) {
            const dx = x - input.positions[i * 3];
            const dy = y - input.positions[i * 3 + 1];
            const dz = z - input.positions[i * 3 + 2];
            const radius = Math.sqrt(dx * dx + dy * dy + dz * dz) + input.sizes[i] / 2;
            maxRadius = Math.max(maxRadius, radius);
        }
        const size = Math.max(minSize, Math.min(constAreaSize, 2 * maxRadius, cellSize * Math.sqrt(3)));

        // append to output
        outputBuffer.positions.push(x, y, z);
        outputBuffer.sizes.push(size);
        outputBuffer.colors.push(r / weightSum, g / weightSum, b / weightSum);
        outputBuffer.normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
        outputBuffer.weights.push(weightSum);
    }

    /**
     * Compute cell index along one dimension.
     * @param pos  position of the point
     * @param bbMin   minimal position of the bounding box
     * @param bbSize  bounding box size
     * @param resolution  number of cells in the bounding box (along one side)
     * @param randomness  adds some randomness to indices (points could move to adjacent cells)
     */
    public static getCellIndex(pos: number, bbMin: number, bbSize: number, resolution: number, randomness: number = 0) {
        const rndOffset = randomness > 0 ? (Math.random() - 0.5) * randomness : 0;
        const index = Math.floor((pos - bbMin) / bbSize * resolution + rndOffset);
        return Math.max(0, Math.min(resolution - 1, index));
    }

}
