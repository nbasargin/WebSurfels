import { LodNode } from 'web-surfels';

export interface LodLoader {

    loadNode(id: number | string): Promise<LodNode>;

}
