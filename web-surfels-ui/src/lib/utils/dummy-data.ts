import { PointCloudData, WeightedPointCloudData } from '../data/point-cloud-data';

export class DummyData {

    public static generateSphere(pointNumber: number, pointSize: number, randomizeColors: boolean = true): PointCloudData {
        const data: PointCloudData = {
            positions: new Float32Array(pointNumber * 3),
            sizes: new Float32Array(pointNumber),
            colors: new Float32Array(pointNumber * 3),
            normals: new Float32Array(pointNumber * 3),
        };

        for (let i = 0; i < pointNumber; i++) {
            const offset = i * 3;
            const randomPoint = DummyData.randomPointOnSphere();

            data.positions[offset] = randomPoint[0];
            data.positions[offset + 1] = randomPoint[1];
            data.positions[offset + 2] = randomPoint[2];

            data.colors[offset] = randomPoint[3];
            data.colors[offset + 1] = randomPoint[4];
            data.colors[offset + 2] = randomPoint[5];

            if (randomizeColors) {
                data.colors[offset] = (data.colors[offset] + Math.random()) / 2;
                data.colors[offset + 1] = (data.colors[offset + 1] + Math.random()) / 2;
                data.colors[offset + 2] = (data.colors[offset + 2] + Math.random()) / 2;
            }

            data.normals[offset] = randomPoint[6];
            data.normals[offset + 1] = randomPoint[7];
            data.normals[offset + 2] = randomPoint[8];
        }

        data.sizes.fill(pointSize);

        return data;
    }

    public static generateAxes(): PointCloudData {
        const pointsPerAxis = 999;
        const positions = new Float32Array(pointsPerAxis * 3 * 3);
        const sizes = new Float32Array(pointsPerAxis * 3);
        const colors = new Float32Array(pointsPerAxis * 3 * 3);
        const normals = new Float32Array(pointsPerAxis * 3 * 3);

        // X axis
        for (let i = 0; i < pointsPerAxis; i++) {
            positions[i * 3] = Math.floor(i / 3) * 0.1;
            normals[i * 3 + i % 3] = 1;
            colors[i * 3] = 1;
        }
        // Y axis
        for (let i = pointsPerAxis; i < pointsPerAxis * 2; i++) {
            positions[i * 3 + 1] = Math.floor((i- pointsPerAxis) / 3)  * 0.1;
            normals[i * 3 + i % 3] = 1;
            colors[i * 3 + 1] = 1;
        }
        // Y axis
        for (let i = pointsPerAxis * 2; i < pointsPerAxis * 3; i++) {
            positions[i * 3 + 2] = Math.floor((i - pointsPerAxis * 2) / 3) * 0.1;
            normals[i * 3 + i % 3] = 1;
            colors[i * 3 + 2] = 1;
        }
        for (let i = 0; i < pointsPerAxis * 3; i++) {
            sizes[i] = 0.2;
        }
        return {positions, sizes, colors, normals};
    }

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

    /**
     * Sample random point on a sphere.
     * Uniform distribution.
     * http://corysimon.github.io/articles/uniformdistn-on-sphere/
     */
    private static randomPointOnSphere(): [number, number, number, number, number, number, number, number, number] {
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(1 - 2 * Math.random());
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);
        return [x, y, z, Math.max(0, x), Math.max(0, y), Math.max(0, z), x, y, z];
    }

    private static randomPointOnCube(): [number, number, number, number, number, number, number, number, number] {
        const axis = Math.floor(Math.random() * 3);
        const direction = Math.random() >= 0.5 ? 1 : -1;

        const pos = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1];
        pos[axis] = direction;
        const normal = [0, 0, 0];
        normal[axis] = direction;
        const color = pos.map(p => Math.max(0, p));

        return [pos[0], pos[1], pos[2], color[0], color[1], color[2], normal[0], normal[1], normal[2]];
    }

}
