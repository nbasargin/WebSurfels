import { PLYLoader } from '@loaders.gl/ply';
import { load, parse } from '@loaders.gl/core';
import { BinaryXHR } from '../utils/binary-xhr';
import { Timing } from '../utils/timing';
import { PointCloudData } from './point-cloud-data';

export class StanfordDragonLoader {

    public static readonly DRAGON_POINT_SIZE = 0.03;
    public static readonly CASTLE_POINT_SIZE = 0.07;

    async load(): Promise<PointCloudData> {
        const rawData = await load('assets/point-clouds/stanford_dragon.ply', PLYLoader);
        return this.parseDragonData(rawData);
    }

    async loadDropbox(): Promise<PointCloudData> {
        const url = "https://www.dl.dropboxusercontent.com/s/9inx5f1n5sm2cp8/stanford_dragon.ply?dl=1";
        return BinaryXHR.get(url).then(buffer => {
            return parse(buffer, PLYLoader);
        }).then(rawData => {
            return this.parseDragonData(rawData);
        });
    }

    parseDragonData(rawData) {
        const sizes = new Float32Array(Math.floor(rawData.attributes.POSITION.value.length / 3));
        sizes.fill(StanfordDragonLoader.DRAGON_POINT_SIZE);
        const data: PointCloudData = {
            positions: rawData.attributes.POSITION.value,
            sizes: sizes,
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
        return data;
    }

    async loadCastle(): Promise<PointCloudData> {
        console.log(Timing.measure(), 'START loading');
        const rawData = await load('http://localhost:5000/3drm_neuschwanstein.ply', PLYLoader);
        console.log(Timing.measure(), 'START parsing data');
        return StanfordDragonLoader.processCastleData(rawData);
    }

    static processCastleData(rawData: any): PointCloudData {
        const sizes = new Float32Array(Math.floor(rawData.attributes.POSITION.value.length / 3));
        sizes.fill(StanfordDragonLoader.CASTLE_POINT_SIZE);
        const data: PointCloudData = {
            positions: rawData.attributes.POSITION.value,
            sizes: sizes,
            normals: rawData.attributes.NORMAL.value,
            colors: new Float32Array(rawData.attributes.COLOR_0.value),
        };
        for (let i = 0; i < data.colors.length; i++) {
            data.colors[i] /= 255.0;
        }
        return data;
    }

}
