import { mat4, vec3 } from 'gl-matrix';
import { PointCloudData } from '../point-cloud-data';
import { StreetViewDepthData } from './street-view-depth-data';
import { StreetViewApi } from './street-view-api';
import { StreetViewPanorama } from './street-view-panorama';

export interface StreetViewLoaderOptions {
    skyDistance: number;
    minNonSkySplatSize: number;
    maxNonSkySplatSize: number;
}

export class StreetViewLoader {

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private options: StreetViewLoaderOptions;

    /**
     * Converts street view panoramas to point clouds.
     *
     * @param options .skyDistance distance for sky splats (= splats not assigned to a plane), if below 0 sky splats are dropped
     *        options .minNonSkySplatSize  minimal size for non-sky splats, non-sky splats smaller than this are dropped
     *        options .maxNonSkySplatSize  maximal size for non-sky splats, non-sky splats larger than this are dropped
     */
    constructor(options: StreetViewLoaderOptions | object = {}) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 256;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        this.options = {
            skyDistance: -1,
            minNonSkySplatSize: 0,
            maxNonSkySplatSize: 5,
            ... options
        };
    }

    async loadPanorama(id: string): Promise<StreetViewPanorama> {

        // load panorama data & bitmap from google
        const [panoramaData, colorData] = await Promise.all([
            StreetViewApi.loadDataById(id),
            StreetViewApi.loadImage(id, 0, 0, 0),
        ]);

        // construct depth data
        const imageWidth = +panoramaData.Data.image_width / (2 ** +panoramaData.Location.zoomLevels);
        const imageHeight = +panoramaData.Data.image_height / (2 ** +panoramaData.Location.zoomLevels);
        if (!panoramaData.model) {
            throw new Error('provided panorama has no depth data');
        }

        const depth = new StreetViewDepthData(panoramaData.model.depth_map);

        // construct point cloud
        const pointCloud = this.constructPointCloud(colorData, imageWidth, imageHeight, depth);

        // rotate point cloud in order to match world orientation
        this.orientData(pointCloud, +panoramaData.Location.lat, +panoramaData.Location.lng, -panoramaData.Projection.pano_yaw_deg + 90);

        // compute world offset
        const worldPosition = this.lngLatToPosition(+panoramaData.Location.lat, +panoramaData.Location.lng);
        const worldCoordinates = {latitude: +panoramaData.Location.lat, longitude: +panoramaData.Location.lng};

        // bounding sphere with center at origin
        let radius = 0;
        const pos = pointCloud.positions;
        for (let i = 0; i < pos.length; i += 3) {
            const dist = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
            const size = pointCloud.sizes[i / 3];
            radius = Math.max(radius, dist + size / 2)
        }

        return {
            id: panoramaData.Location.panoId,
            boundingSphere: {centerX: 0, centerY: 0, centerZ: 0, radius},
            data: pointCloud,
            links: panoramaData.Links.map(link => link.panoId),
            worldPosition,
            worldCoordinates
        };
    }


    /**
     * Constructs point cloud from given color and depth data.
     *
     * @param colorData
     * @param imageWidth - effective image width (typically 416 or 512), can be computed with image_width / (2 ^ num_zoom_levels)
     * @param imageHeight - effective image height (typically 208 or 256), can be computed with image_height / (2 ^ num_zoom_levels)
     * @param depthData
     */
    private constructPointCloud(colorData: ImageBitmap, imageWidth: number, imageHeight: number, depthData: StreetViewDepthData): PointCloudData {
        const splatScale = 0.02;

        this.ctx.drawImage(colorData, 0, 0);
        const pixels = this.ctx.getImageData(0, 0, 512, 256).data;

        const positions: Array<number> = [];
        const sizes: Array<number> = [];
        const colors: Array<number> = [];
        const normals: Array<number> = [];

        const w = depthData.header.width;
        const h = depthData.header.height;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const planeID = depthData.indices[y * w + x];
                const splatBelongsToSky = planeID === 0;
                if (splatBelongsToSky && this.options.skyDistance <= 0) {
                    continue; // point does not belong to a plane & sky should be discarded
                }

                const phi = (w - x - 1) / (w - 1) * 2 * Math.PI + Math.PI / 2;
                const theta = (h - y - 1) / (h - 1) * Math.PI;

                const px = Math.sin(theta) * Math.cos(phi);
                const py = Math.sin(theta) * Math.sin(phi);
                const pz = Math.cos(theta);

                let t: number;
                let plane: { normal: [number, number, number], distance: number };
                if (planeID !== 0) {
                    plane = depthData.planes[planeID];
                    t = plane.distance / (px * plane.normal[0] + py * plane.normal[1] + pz * plane.normal[2]);
                } else {
                    t = -this.options.skyDistance;
                    plane = {normal: [-px, -py, -pz], distance: 0}
                }

                // size correction based on orientation:
                // 1 / cos (angle between normal and ray to point) = 1 / dot product (normal, ray to point)
                const orientationCorrection = 1 / Math.abs(px * plane.normal[0] + py * plane.normal[1] + pz * plane.normal[2]);
                const distanceCorrection = Math.abs(t) + 0.001;
                const size = splatScale * distanceCorrection * orientationCorrection;
                if (!splatBelongsToSky && (size > this.options.maxNonSkySplatSize || size < this.options.minNonSkySplatSize)) {
                    continue; // discard non-sky points that are too large
                }

                // color: map x and y to pixel position (depends on effective image size)
                const pixelX = Math.floor(x * (imageHeight - 1) / (h - 1));
                const pixelY = Math.floor(y * (imageWidth - 1) / (w - 1));

                const r = pixels[4 * (pixelY * w + pixelX)] / 255;
                const g = pixels[4 * (pixelY * w + pixelX) + 1] / 255;
                const b = pixels[4 * (pixelY * w + pixelX) + 2] / 255;

                positions.push(px * t, py * t, pz * t);
                sizes.push(size);
                colors.push(r, g, b);
                normals.push(-plane.normal[0], -plane.normal[1], -plane.normal[2]);
            }
        }

        return {
            positions: new Float32Array(positions),
            sizes: new Float32Array(sizes),
            colors: new Float32Array(colors),
            normals: new Float32Array(normals),
        }

    }

    private lngLatToPosition(latitude: number, longitude: number) {
        // x-axis goes through (lat, lng) = (0, 0)
        // y-axis goes through (lat, lng) = (0, 90)
        // z-axis goes through the poles

        const earthRadius = 6371000; // meters
        latitude = latitude * Math.PI / 180;
        longitude = longitude * Math.PI / 180;
        const x = Math.cos(latitude) * Math.cos(longitude) * earthRadius;
        const y = Math.cos(latitude) * Math.sin(longitude) * earthRadius;
        const z = Math.sin(latitude) * earthRadius;

        return {x, y, z};
    }

    private orientData(data: PointCloudData, latitude: number, longitude: number, yawDegree: number) {
        const latAngle = -(latitude - 90) * Math.PI / 180;
        const lngAngle = longitude * Math.PI / 180;
        const yawAngle = yawDegree * Math.PI / 180;

        const rotMatrix = mat4.create();
        mat4.rotateZ(rotMatrix, rotMatrix, lngAngle);
        mat4.rotateY(rotMatrix, rotMatrix, latAngle);
        mat4.rotateZ(rotMatrix, rotMatrix, yawAngle);

        for (let i = 0; i < data.positions.length; i += 3) {
            const position = new Float32Array(data.positions.buffer, i * 4, 3);
            vec3.transformMat4(position, position, rotMatrix);
            const normal = new Float32Array(data.normals.buffer, i * 4, 3);
            vec3.transformMat4(normal, normal, rotMatrix);
        }
    }

}
