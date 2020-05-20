import { RendererNode } from '../../renderer/renderer-node';
import { BoundingSphere } from '../../utils/bounding-geometry';

export type PanoramaLOD = {
    boundingSphere: BoundingSphere;
    rendererNode: RendererNode;
}


export interface DynamicStreetViewNode {

    id: string;
    links: Array<string>; // ids of neighboring panoramas
    center: { x: number, y: number, z: number }; // in object space (not in world coords!)
    lod: {
        original: PanoramaLOD,
        high: PanoramaLOD,
        medium: PanoramaLOD,
        low: PanoramaLOD,
    }

}
