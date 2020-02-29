import { PointCloudData } from '../../data/point-cloud-data';
import { LodBuilder } from '../lod-builder';
import { InnerDataNode } from './data-nodes/inner-data-node';
import { OctreeDataNode } from './data-nodes/octree-data-node';
import { BoundingBox } from '../../utils/geometry';
import { LodTree } from '../lod-tree';
import { Subgrid } from './subgrid/subgrid';

/**
 * Creates a lod representation using an octree.
 * First, data is added to the builder which creates a data octree.
 * After all data has been added, the data octree is converted into a lod tree.
 * This process removes all the original data in the process.
 */
export class OctreeLodBuilder implements LodBuilder {

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

    buildLod(): LodTree {
        const lod = this.root.computeLOD(new Subgrid(this.resolution));
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
