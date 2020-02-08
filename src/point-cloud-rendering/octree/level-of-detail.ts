import { NodeSubgrid } from './node-subgrid';
import { StaticOctreeNode } from './static-octree-node';

export class LevelOfDetail {

    private static readonly spacing = 64;
    private static readonly subgrid = new NodeSubgrid(LevelOfDetail.spacing);

    public static mergeToMany(node: StaticOctreeNode): { positions: Float32Array, sizes: Float32Array, colors: Float32Array, normals: Float32Array, weights: Float32Array } {
        const numPoints = node.pointPositions.length / 3;

        LevelOfDetail.subgrid.clear();
        const [x, y, z] = node.nodePosition;
        const spacing = LevelOfDetail.spacing;

        const data = {
            positions: node.pointPositions,
            sizes: node.pointSizes,
            colors: node.pointColors,
            normals: node.pointNormals,
        };

        for (let i = 0; i < numPoints; i++) {
            // based on position, determine cell
            const px = Math.floor((node.pointPositions[i * 3] - x) / node.nodeSize * spacing);
            const py = Math.floor((node.pointPositions[i * 3 + 1] - y) / node.nodeSize * spacing);
            const pz = Math.floor((node.pointPositions[i * 3 + 2] - z) / node.nodeSize * spacing);
            const index = px + py * spacing + pz * spacing ** 2;

            // put point into cell
            LevelOfDetail.subgrid.addToCell(index, data, i, node.pointWeights[i]);
        }

        // go over all (occupied) cells, merge points in them into one

        return LevelOfDetail.subgrid.mergeByCell(null as any, []);

    }

}
