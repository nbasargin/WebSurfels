import { PointCloudData, WeightedPointCloudData } from '../data/point-cloud-data';

export class DataUtils {

    public static mergeData(nodes: Array<WeightedPointCloudData>): WeightedPointCloudData {
        let points = 0;
        for (const node of nodes) {
            points += node.positions.length / 3;
        }
        const merged = {
            positions: new Float32Array(points * 3),
            sizes: new Float32Array(points),
            colors: new Float32Array(points * 3),
            normals: new Float32Array(points * 3),
            weights: new Float32Array(points),
        };
        let writePos = 0;
        for (const node of nodes) {
            merged.positions.set(node.positions, writePos * 3);
            merged.sizes.set(node.sizes, writePos);
            merged.colors.set(node.colors, writePos * 3);
            merged.normals.set(node.normals, writePos * 3);
            merged.weights.set(node.weights, writePos);
            writePos += node.positions.length / 3;
        }
        return merged;
    }

    public static multiplyData(data: PointCloudData, instances: number, spacing: number): PointCloudData {
        const sideInstances = Math.floor(Math.sqrt(instances));
        let x = 0;
        let z = 0;
        let writePos = 0;
        const multiplied: PointCloudData = {
            positions: new Float32Array(data.positions.length * instances),
            sizes: new Float32Array(data.sizes.length * instances),
            colors: new Float32Array(data.colors.length * instances),
            normals: new Float32Array(data.normals.length * instances),
        };

        for (let inst = 0; inst < instances; inst++) {
            const goalX = ((inst % sideInstances) - sideInstances / 2) * spacing;
            const goalZ = (Math.floor(inst / sideInstances) - sideInstances / 2) * spacing;
            const dx = goalX - x;
            const dz = goalZ - z;
            x = goalX;
            z = goalZ;
            for (let i = 0; i < data.positions.length; i += 3) {
                data.positions[i] += dx;
                data.positions[i + 2] += dz;
            }
            multiplied.positions.set(data.positions, writePos * 3);
            multiplied.sizes.set(data.sizes, writePos);
            multiplied.colors.set(data.colors, writePos * 3);
            multiplied.normals.set(data.normals, writePos * 3);

            writePos += data.positions.length / 3;
        }
        return multiplied;
    }

}
