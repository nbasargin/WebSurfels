import { PointCloudData } from '../data/point-cloud-data';
import { Geometry } from '../utils/geometry';
import { InnerNode } from './inner-node';
import { LodNode } from './lod-node';
import { OctreeNode } from './octree-node';
import { Subgrid } from './subgrid';

type BoundingBox = {minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number};

export class Octree2 {

    readonly root: OctreeNode;
    readonly boundingBox: BoundingBox;

    constructor(data: PointCloudData, public readonly resolution: number, public readonly maxDepth: number) {
        this.boundingBox = Geometry.getBoundingBox(data.positions);
        const min = Math.min(this.boundingBox.minX, this.boundingBox.minY, this.boundingBox.minZ);
        const max = Math.max(this.boundingBox.maxX, this.boundingBox.maxY, this.boundingBox.maxZ);
        const size = max - min;

        this.root = new InnerNode({
            size,
            resolution,
            centerX: (this.boundingBox.maxX - this.boundingBox.minX) / 2 + this.boundingBox.minX,
            centerY: (this.boundingBox.maxY - this.boundingBox.minY) / 2 + this.boundingBox.minY,
            centerZ: (this.boundingBox.maxZ - this.boundingBox.minZ) / 2 + this.boundingBox.minZ,
        }, maxDepth);

        for (let i = 0; i < data.positions.length / 3; i++) {
            this.root.addPoint(data, i);
        }
        console.log(`Created octree with ${this.root.getNumberOfNodes()} nodes and total depth of ${this.root.getDepth()}.`);
    }

    createLOD(): LodNode {
        return this.root.computeLOD(new Subgrid(this.resolution));
    }

}
