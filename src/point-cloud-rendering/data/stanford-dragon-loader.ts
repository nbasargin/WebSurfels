import { PLYLoader } from '@loaders.gl/ply';
import { load } from '@loaders.gl/core';
import { PointCloudData } from './point-cloud-data';

export class StanfordDragonLoader {

    async load(keepEveryNth: number = 1): Promise<PointCloudData> {
        const rawData = await load('assets/point-clouds/stanford_dragon.ply', PLYLoader);

        const data: PointCloudData = {
            positions: rawData.attributes.POSITION.value,
            normals: rawData.attributes.NORMAL.value,
            colors: new Float32Array(rawData.attributes.COLOR_0.value),
        };
        for (let i = 0; i < data.positions.length; i++) {
            data.positions[i] *= 20.0;
        }
        for (let i = 1; i < data.positions.length; i+=3) {
            data.positions[i] -= 2.5;
        }
        for (let i = 0; i < data.colors.length; i++) {
            data.colors[i] /= 255.0;
        }

        // drop points
        if (keepEveryNth > 1) {
            data.positions = StanfordDragonLoader.dropPoints(data.positions, keepEveryNth);
            data.colors = StanfordDragonLoader.dropPoints(data.colors, keepEveryNth);
            data.normals = StanfordDragonLoader.dropPoints(data.normals, keepEveryNth);
        }

        return data;
    }

    private static dropPoints(data: Float32Array, keepEveryNth: number): Float32Array {
        const newNumPoints = Math.floor(data.length / 3 / keepEveryNth);

        const newPoints = new Float32Array(newNumPoints * 3);

        for (let i = 0; i < newNumPoints; i++) {
            newPoints[i * 3] = data[i * 3 * keepEveryNth];
            newPoints[i * 3 + 1] = data[i * 3 * keepEveryNth + 1];
            newPoints[i * 3 + 2] = data[i * 3 * keepEveryNth + 2];
        }
        return newPoints
    }

}
