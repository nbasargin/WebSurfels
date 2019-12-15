import { PointCloudData } from "./point-cloud-data";

export class PointCloudDataGenerator {

    generateSphere(pointNumber: number): PointCloudData {
        const data = new PointCloudData();

        data.positions = new Float32Array(pointNumber * 3);
        data.colors = new Float32Array(pointNumber * 3);
        data.normals = new Float32Array(pointNumber * 3);
        for (let i = 0; i < pointNumber; i++) {
            const offset = i * 3;
            const randomPoint = PointCloudDataGenerator.randomPointOnSphere();

            data.positions[offset] = randomPoint[0];
            data.positions[offset + 1] = randomPoint[1];
            data.positions[offset + 2] = randomPoint[2];

            data.colors[offset] = 0.5;
            data.colors[offset + 1] = 0.5;
            data.colors[offset + 2] = 0.5;

            data.normals[offset] = randomPoint[0];
            data.normals[offset + 1] = randomPoint[1];
            data.normals[offset + 2] = randomPoint[2];
        }

        return data;
    }


    /**
     * Sample random point on a sphere.
     * Uniform distribution.
     * http://corysimon.github.io/articles/uniformdistn-on-sphere/
     */
    private static randomPointOnSphere(): [number, number, number] {
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(1 - 2 * Math.random());
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);
        return [x, y, z];
    }


}
