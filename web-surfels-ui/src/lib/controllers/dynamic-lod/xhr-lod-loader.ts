import { LodLoader } from './lod-loader';
import { LodNode } from '../../data/level-of-detail/lod-node';
import { BinaryXHR } from '../../data/loaders/binary-xhr';
import { LodBinary } from '../../data/level-of-detail/lod-binary';

export class XhrLodLoader implements LodLoader {

    constructor(public baseUrl: string) {
    }

    async loadNode(id: number | string): Promise<LodNode> {
        const url = this.baseUrl + id + '.lod';
        const buffer = await BinaryXHR.get(url);
        return LodBinary.fromBinary(buffer);
    }

}