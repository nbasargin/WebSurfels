import { BinaryXHR, LodBinary, LodNode } from 'web-surfels';
import { LodLoader } from './lod-loader';

export class XhrLodLoader implements LodLoader {

    constructor(public baseUrl: string) {
    }

    async loadNode(id: number | string): Promise<LodNode> {
        const url = this.baseUrl + id + '.lod';
        const buffer = await BinaryXHR.get(url);
        return LodBinary.fromBinary(buffer);
    }

}
