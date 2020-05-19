import { BoundingSphere } from '../../utils/bounding-geometry';
import { PointCloudData } from '../point-cloud-data';

export interface StreetViewPanorama {
    id: string;
    boundingSphere: BoundingSphere;
    data: PointCloudData;
    links: Array<string>; // ids of neighboring panoramas
    worldPosition: { x: number, y: number, z: number };
    worldCoordinates: { latitude: number, longitude: number };
}
