import { LASWorkerLoader } from '@loaders.gl/las';
import { load } from '@loaders.gl/core';
import { PointCloudData } from './point-cloud-data';

export class LasDataLoader {

    constructor() {
    }

    async loadLas(): Promise<PointCloudData> {
        const rawData = await load('assets/point-clouds/lion.las', LASWorkerLoader);
        console.log(rawData);

        const data = new PointCloudData();

        data.positions = rawData.attributes.POSITION.value;
        data.normals = new Float32Array(data.positions.length);
        data.colors = new Float32Array(data.positions.length);

        console.log(rawData.attributes);

        const numPoints = rawData.attributes.POSITION.value.length / 3;
        for (let i = 0; i < numPoints; i++) {
            //const offsetRaw = i * 4;
            const offsetNew = i * 3;


            // set color
            data.colors[offsetNew] = 1; // rawData.attributes.COLOR_0.value[offsetRaw];
            data.colors[offsetNew + 1] = 1; //rawData.attributes.COLOR_0.value[offsetRaw + 1];
            data.colors[offsetNew + 2] = 1; // rawData.attributes.COLOR_0.value[offsetRaw + 2];

            // switch coords
            const y = data.positions[offsetNew + 1];
            data.positions[offsetNew] = data.positions[offsetNew] + 2;
            data.positions[offsetNew + 1] = data.positions[offsetNew + 2] + 1;
            data.positions[offsetNew + 2] = y - 10;
        }

        return data;
    }

}
