import { WeightedPointCloudData } from '../../../data/point-cloud-data';
import { BoundingCube } from '../../../utils/geometry';
import { Subcell } from './subcell';

type SubgridOutputBuffer = {
    positions: Array<number>;
    sizes: Array<number>;
    colors: Array<number>;
    normals: Array<number>;
    weights: Array<number>;
};

export class Subgrid {

    private readonly indexGrid: Int32Array;

    constructor(
        public readonly resolution: number = 64,
        public readonly indexRandomness: number = 0,
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
            const px = Subcell.getCellIndex(pos[i * 3], minX, size, this.resolution, this.indexRandomness);
            const py = Subcell.getCellIndex(pos[i * 3 + 1], minY, size, this.resolution, this.indexRandomness);
            const pz = Subcell.getCellIndex(pos[i * 3 + 2], minZ, size, this.resolution, this.indexRandomness);
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

        const normalLength = Math.max(0.0001, Math.sqrt(nx * nx + ny * ny + nz * nz));

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
        const size = Math.min(constAreaSize, maxRadius * Math.sqrt(2), cellSize * Math.sqrt(3));

        // append to output
        outputBuffer.positions.push(x / weightSum, y / weightSum, z / weightSum);
        outputBuffer.sizes.push(size);
        outputBuffer.colors.push(r / weightSum, g / weightSum, b / weightSum);
        outputBuffer.normals.push(nx / normalLength, ny / normalLength, nz / normalLength);
        outputBuffer.weights.push(weightSum);
    }

    // temporary
/*
    mergeLoD2(childLoDs: Array<WeightedLodNode>, nodeInfo: OctreeNodeInfo, indexRandomness: number = 0): WeightedLodNode {
        const mergedLoD: WeightedPointCloudData = Geometry.mergeLodNodes(childLoDs);
        const minX = nodeInfo.centerX - nodeInfo.size / 2;
        const minY = nodeInfo.centerY - nodeInfo.size / 2;
        const minZ = nodeInfo.centerZ - nodeInfo.size / 2;
        const reduced = this.reduce(mergedLoD, {minX, minY, minZ, size: nodeInfo.size});

        const boundingSphere = Geometry.getBoundingSphere(reduced.positions, reduced.sizes);
        // ensure that resulting bounding sphere contains children bounding spheres
        // advantage: if parent is outside of frustum, children are guaranteed to be outside frustum as well
        for (const child of childLoDs) {
            const dist = Geometry.sphereDist(boundingSphere, child.boundingSphere);
            const minRadius = dist + child.boundingSphere.radius;
            if (boundingSphere.radius < minRadius) {
                boundingSphere.radius = minRadius;
            }
        }

        return {
            id: UidGenerator.genUID(),
            boundingSphere: boundingSphere,
            data: {
                positions: reduced.positions,
                sizes: reduced.sizes,
                colors: reduced.colors,
                normals: reduced.normals
            },
            childIDs: childLoDs.map(child => child.id),
            children: childLoDs,
            weights: reduced.weights,
        };
    }*/

}
