import { mat4, vec3 } from 'gl-matrix';
import { PointCloudData } from '../data/point-cloud-data';
import { BoundingSphere } from '../utils/geometry';
import { DepthData } from './depth-data';
import { PanoramaLoader } from './panorama-loader';
import { StreetViewConverter, StreetViewConverterOptions } from './street-view-converter';

export interface GSVPanorama {
    id: string;
    boundingSphere: BoundingSphere;
    data: PointCloudData;
    links: Array<string>; // ids of neighboring panoramas
    worldPosition: {x: number, y: number, z: number};
    worldCoordinates: {latitude: number, longitude: number};
}


export class GSVPanoramaLoader {

    private streetViewConverter: StreetViewConverter;

    constructor(options: StreetViewConverterOptions | object = {}) {
        this.streetViewConverter = new StreetViewConverter(options);
    }

    async loadPanorama(id: string): Promise<GSVPanorama> {
        // load panorama data & bitmap from google
        const [pano, bitmap] = await Promise.all([
            PanoramaLoader.loadById(id),
            PanoramaLoader.loadImage(id, 0, 0, 0),
        ]);

        // construct depth data
        const imageWidth = +pano.Data.image_width / (2 ** +pano.Location.zoomLevels);
        const imageHeight = +pano.Data.image_height / (2 ** +pano.Location.zoomLevels);
        const depth = new DepthData(pano.model.depth_map);

        // construct point cloud
        const pointCloud =  this.streetViewConverter.constructPointCloud(bitmap, imageWidth, imageHeight, depth);

        // rotate point cloud in order to match world orientation
        const angleZ = (-pano.Projection.pano_yaw_deg + 90) * Math.PI / 180;
        this.rotateDataZ(pointCloud, angleZ);
        this.rotateByLatLng(pointCloud, +pano.Location.lat, +pano.Location.lng);

        // compute world offset
        const worldPosition = this.lngLatToNormalOffset(+pano.Location.lat, +pano.Location.lng);
        const worldCoordinates = {latitude: +pano.Location.lat, longitude: +pano.Location.lng};

        // bounding sphere
        // todo

        return {
            id: pano.Location.panoId,
            boundingSphere: null as any,
            data: pointCloud,
            links: pano.Links.map(link => link.panoId),
            worldPosition,
            worldCoordinates
        };
    }


    private rotateDataZ(data: PointCloudData, angle: number) {
        const zero = vec3.fromValues(0, 0, 0);
        for (let i = 0; i < data.positions.length; i += 3) {
            const point = new Float32Array(data.positions.buffer, i * 4, 3);
            vec3.rotateZ(point, point, zero, angle);
            const point2 = new Float32Array(data.normals.buffer, i * 4, 3);
            vec3.rotateZ(point2, point2, zero, angle);
        }
    }

    private lngLatToNormalOffset(latitude: number, longitude: number) {
        const earthRadius = 6371000; // meters
        latitude = latitude * Math.PI / 180;
        longitude = longitude * Math.PI / 180;
        const x = Math.cos(latitude) * Math.cos(longitude) * earthRadius;
        const y = Math.cos(latitude) * Math.sin(longitude) * earthRadius;
        const z = Math.sin(latitude) * earthRadius;

        return {x, y, z};
    }


    private rotateByLatLng(data: PointCloudData, latitude: number, longitude: number) {
        // data up vector: (0, 0, 1)
        // for latitude = longitude = 0°, the transformed vector should be (1, 0, 0)

        latitude = (latitude - 90) * Math.PI / 180;
        longitude = (longitude - 180) * Math.PI / 180;

        const rotMatrix = mat4.create();
        mat4.rotateZ(rotMatrix, rotMatrix, longitude);
        mat4.rotateY(rotMatrix, rotMatrix, latitude);

        for (let i = 0; i < data.positions.length; i += 3) {
            const position = new Float32Array(data.positions.buffer, i * 4, 3);
            vec3.transformMat4(position, position, rotMatrix);
            const normal = new Float32Array(data.normals.buffer, i * 4, 3);
            vec3.transformMat4(normal, normal, rotMatrix);
        }

    }

}
