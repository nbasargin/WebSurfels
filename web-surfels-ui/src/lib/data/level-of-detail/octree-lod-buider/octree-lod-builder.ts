import { PointCloudData } from '../../point-cloud-data';
import { WeightedLodNode } from '../lod-node';
import { InnerDataNode } from './inner-data-node';
import { OctreeDataNode } from './octree-data-node';
import { BoundingBox } from '../../../utils/bounding-geometry';
import { Subgrid } from '../subgrid';

/**
 * Creates a lod representation using an octree.
 * First, data is added to the builder which creates a data octree.
 * After all data has been added, the data octree is converted into a lod tree.
 * This process removes all the original data in the process.
 */
export class OctreeLodBuilder {

    root: OctreeDataNode;

    constructor(public readonly boundingBox: BoundingBox, public readonly resolution: number, public readonly maxDepth: number) {
        this.root = this.constructInitialRoot();
    }

    addData(data: PointCloudData) {
        for (let i = 0; i < data.positions.length / 3; i++) {
            this.root.addPoint(data, i);
        }
        console.log(`Added data to octree. The tree now has ${this.root.getNumberOfNodes()} nodes and a total depth of ${this.root.getDepth()}.`);
    }

    buildLod(jitter: number = 0): WeightedLodNode {
        const lod = this.root.computeLOD(new Subgrid(this.resolution, jitter));
        this.root = this.constructInitialRoot();
        return lod;
    }

    private constructInitialRoot(): OctreeDataNode {
        const min = Math.min(this.boundingBox.minX, this.boundingBox.minY, this.boundingBox.minZ);
        const max = Math.max(this.boundingBox.maxX, this.boundingBox.maxY, this.boundingBox.maxZ);
        const size = max - min;

        return new InnerDataNode({
            size,
            resolution: this.resolution,
            centerX: (this.boundingBox.maxX - this.boundingBox.minX) / 2 + this.boundingBox.minX,
            centerY: (this.boundingBox.maxY - this.boundingBox.minY) / 2 + this.boundingBox.minY,
            centerZ: (this.boundingBox.maxZ - this.boundingBox.minZ) / 2 + this.boundingBox.minZ,
        }, this.maxDepth);
    }

}
