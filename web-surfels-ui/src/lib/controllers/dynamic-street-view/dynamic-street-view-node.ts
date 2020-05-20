import { RendererNode } from '../../renderer/renderer-node';
import { BoundingSphere } from '../../utils/bounding-geometry';

export type PanoramaLOD = {
    boundingSphere: BoundingSphere;
    rendererNode: RendererNode;
}


export interface DynamicStreetViewNode {

    id: string;
    links: Array<string>; // ids of neighboring panoramas
    worldPosition: { x: number, y: number, z: number };
    lod: {
        original: PanoramaLOD,
        high: PanoramaLOD,
        medium: PanoramaLOD,
        low: PanoramaLOD,
    }

}
