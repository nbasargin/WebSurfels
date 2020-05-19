import { LodNode } from './lod-node';

export interface LodLoader {

    loadNode(id: number | string): Promise<LodNode>;

}
