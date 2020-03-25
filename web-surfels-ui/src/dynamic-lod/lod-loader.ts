import { LodNode } from "../lib/level-of-detail/lod-node";

export interface LodLoader {

    loadNode(id: number | string): Promise<LodNode>;

}
