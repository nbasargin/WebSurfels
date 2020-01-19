import { PLYLoader } from '@loaders.gl/ply';
import { load } from '@loaders.gl/core';
import { PointCloudData } from './point-cloud-data';

export class StanfordDragonLoader {

    async load(): Promise<PointCloudData> {
        const rawData = await load('assets/point-clouds/stanford_dragon.ply', PLYLoader);

        const data = new PointCloudData();
        data.positions = rawData.attributes.POSITION.value;
        for (let i = 0; i < data.positions.length; i++) {
            data.positions[i] *= 20.0;
        }
        for (let i = 1; i < data.positions.length; i+=3) {
            data.positions[i] -= 2.5;
        }
        data.normals = rawData.attributes.NORMAL.value;
        data.colors = new Float32Array(rawData.attributes.COLOR_0.value);
        for (let i = 0; i < data.colors.length; i++) {
            data.colors[i] /= 255.0;
        }

        return data;
    }

}
