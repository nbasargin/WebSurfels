import { mat4, vec3 } from 'gl-matrix';
import { PointCloudData } from '../data/point-cloud-data';
import { BoundingSphere } from '../utils/geometry';
import { DepthData } from './depth-data';
import { GSVApiResponse } from './gsv-api-response';
import { StreetViewConverter, StreetViewConverterOptions } from './street-view-converter';

export interface GSVPanorama {
    id: string;
    boundingSphere: BoundingSphere;
    data: PointCloudData;
    links: Array<string>; // ids of neighboring panoramas
    worldPosition: { x: number, y: number, z: number };
    worldCoordinates: { latitude: number, longitude: number };
}


export class GSVPanoramaLoader {

    private streetViewConverter: StreetViewConverter;

    constructor(options: StreetViewConverterOptions | object = {}) {
        this.streetViewConverter = new StreetViewConverter(options);
    }

    async loadPanorama(id: string): Promise<GSVPanorama> {
        // load panorama data & bitmap from google
        const [pano, bitmap] = await Promise.all([
            GSVPanoramaLoader.loadById(id),
            GSVPanoramaLoader.loadImage(id, 0, 0, 0),
        ]);

        // construct depth data
        const imageWidth = +pano.Data.image_width / (2 ** +pano.Location.zoomLevels);
        const imageHeight = +pano.Data.image_height / (2 ** +pano.Location.zoomLevels);
        const depth = new DepthData(pano.model.depth_map);

        // construct point cloud
        const pointCloud = this.streetViewConverter.constructPointCloud(bitmap, imageWidth, imageHeight, depth);

        // rotate point cloud in order to match world orientation
        GSVPanoramaLoader.orientData(pointCloud, +pano.Location.lat, +pano.Location.lng, -pano.Projection.pano_yaw_deg + 90);

        // compute world offset
        const worldPosition = GSVPanoramaLoader.lngLatToPosition(+pano.Location.lat, +pano.Location.lng);
        const worldCoordinates = {latitude: +pano.Location.lat, longitude: +pano.Location.lng};

        // bounding sphere with center at origin
        let radius = 0;
        const pos = pointCloud.positions;
        for (let i = 0; i < pos.length; i += 3) {
            const dist = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
            const size = pointCloud.sizes[i / 3];
            radius = Math.max(radius, dist + size / 2)
        }

        return {
            id: pano.Location.panoId,
            boundingSphere: {centerX: 0, centerY: 0, centerZ: 0, radius},
            data: pointCloud,
            links: pano.Links.map(link => link.panoId),
            worldPosition,
            worldCoordinates
        };
    }

    private static lngLatToPosition(latitude: number, longitude: number) {
        const earthRadius = 6371000; // meters
        latitude = latitude * Math.PI / 180;
        longitude = longitude * Math.PI / 180;
        const x = Math.cos(latitude) * Math.cos(longitude) * earthRadius;
        const y = Math.cos(latitude) * Math.sin(longitude) * earthRadius;
        const z = Math.sin(latitude) * earthRadius;

        return {x, y, z};
    }

    private static orientData(data: PointCloudData, latitude: number, longitude: number, yawDegree: number) {
        const zAngle = (longitude - 180) * Math.PI / 180;
        const yAngle = (latitude - 90) * Math.PI / 180;
        const zAngle1 = yawDegree * Math.PI / 180;

        const rotMatrixA = mat4.create();
        mat4.rotateZ(rotMatrixA, rotMatrixA, zAngle1);

        const rotMatrix = mat4.create();
        mat4.rotateZ(rotMatrix, rotMatrix, zAngle);
        mat4.rotateY(rotMatrix, rotMatrix, yAngle);
        mat4.rotateZ(rotMatrix, rotMatrix, zAngle1);

        for (let i = 0; i < data.positions.length; i += 3) {
            const position = new Float32Array(data.positions.buffer, i * 4, 3);
            vec3.transformMat4(position, position, rotMatrix);
            const normal = new Float32Array(data.normals.buffer, i * 4, 3);
            vec3.transformMat4(normal, normal, rotMatrix);
        }
    }


    // ID like 'GTKQkr3G-rRZQisDUMzUtg'
    private static async loadById(panoID: string): Promise<GSVApiResponse> {
        const url = `http://maps.google.com/cbk?output=json&panoid=${panoID}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    // Location like 40.762475, -73.974363
    private static async loadByLocation(lat: number, lng: number): Promise<GSVApiResponse> {
        const url = `http://maps.google.com/cbk?output=json&ll=${lat},${lng}&dm=1`;
        const response = await fetch(url);
        return response.json();
    }

    private static async loadImage(panoID: string, zoom: number, x: number, y: number): Promise<ImageBitmap> {
        const url = `http://maps.google.com/cbk?output=tile&panoid=${panoID}&zoom=${zoom}&x=${x}&y=${y}`;
        const response = await fetch(url);
        const blob = await response.blob();
        return createImageBitmap(blob);
    }

}
