import { BoundingSphere } from '../utils/geometry';
import { PointCloudData } from './point-cloud-data';

export class PointCloudDataGenerator {

    public static generateBoundingSphere(sphere: BoundingSphere) {
        const pointNumber = 1000;
        const data = PointCloudDataGenerator.generateSphere(pointNumber, sphere.radius / 10, false);
        for (let i = 0; i < pointNumber; i++) {
            const offset = i * 3;
            data.positions[offset] = data.positions[offset] * sphere.radius + sphere.centerX;
            data.positions[offset + 1] = data.positions[offset + 1] * sphere.radius + sphere.centerY;
            data.positions[offset + 2] = data.positions[offset + 2] * sphere.radius + sphere.centerZ;

            data.colors[offset] = 0.5;
            data.colors[offset + 1] = 0.5;
            data.colors[offset + 2] = 0.5;
        }
        return data;
    }

    public static generateSphere(pointNumber: number, pointSize: number, randomizeColors: boolean = true): PointCloudData {
        const data: PointCloudData = {
            positions: new Float32Array(pointNumber * 3),
            sizes: new Float32Array(pointNumber),
            colors: new Float32Array(pointNumber * 3),
            normals: new Float32Array(pointNumber * 3),
        };

        for (let i = 0; i < pointNumber; i++) {
            const offset = i * 3;
            const randomPoint = PointCloudDataGenerator.randomPointOnSphere();

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

    public static genAxis(): PointCloudData {
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

        return [...pos, ...color, ...normal] as any;
    }

    private static randomPointOnQuads(): [number, number, number, number, number, number, number, number, number] {
        const x = Math.random() * 2 - 1;
        const y = Math.random() * 2 - 1;
        const z = Math.floor(Math.random() * 5) + y;

        const r = Math.random() * 0.3 + 0.7 * (1 - z / 4);
        const g = Math.random() * 0.3 + 0.7 * (1 - z / 4);
        const b = Math.random() * 0.3 + 0.7 * (1 - z / 4);

        const nx = 0;
        const ny = Math.sqrt(2) / 2;
        const nz = Math.sqrt(2) / 2;

        return [x, y, -z, r, g, b, nx, ny, nz];
    }

    private static randomPointOnQuads2() {
        const x = Math.floor(Math.random() * 5) - 2 + Math.random() * 0.5;  // {0, 1, ... 4} - 2 + [0 ... 0.5]
        const y = Math.floor(Math.random() * 5) - 2 + Math.random() * 0.5;
        const z = 0;
        return [x, y, -z, 0.9, 0.9, 0.9, 0, 0, 1];
    }

}
