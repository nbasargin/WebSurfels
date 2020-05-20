import { BoundingSphere } from '../../utils/bounding-geometry';
import { Point3d } from '../../utils/point3d';
import { PointCloudData } from '../point-cloud-data';

export interface StreetViewPanorama {
    id: string;
    boundingSphere: BoundingSphere;  // might be removed
    data: PointCloudData;
    links: Array<string>; // ids of neighboring panoramas
    worldPosition: Point3d;
    worldCoordinates: { latitude: number, longitude: number };
}
