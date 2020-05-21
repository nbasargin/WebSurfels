import { mat4, vec3 } from 'gl-matrix';
import { PointCloudData } from '../point-cloud-data';
import { StreetViewDepthData } from './street-view-depth-data';
import { StreetViewApi } from './street-view-api';
import { StreetViewPanorama } from './street-view-panorama';

export interface StreetViewLoaderOptions {
    minSplatSize: number;
    maxSplatSize: number;
}

type PointCloudOutputOutputBuffer = {
    positions: Array<number>;
    sizes: Array<number>;
    colors: Array<number>;
    normals: Array<number>;
}

export class StreetViewLoader {

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private options: StreetViewLoaderOptions;

    /**
     * Converts street view panoramas to point clouds.
     *
     * @param options .minSplatSize  splats below this size will be merged when possible
     *        options .maxSplatSize  splats larger than this are dropped
     */
    constructor(options: StreetViewLoaderOptions | object = {}) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 256;
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

        this.options = {
            minSplatSize: 0,
            maxSplatSize: 5,
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
        this.ctx.drawImage(colorData, 0, 0);
        const pixels: Uint8ClampedArray = this.ctx.getImageData(0, 0, 512, 256).data;

        const output: PointCloudOutputOutputBuffer = {
            positions: [],
            sizes: [],
            colors: [],
            normals: [],
        };

        const w = depthData.header.width;
        const h = depthData.header.height;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                this.constructPoint(x, y, pixels, imageWidth, imageHeight, depthData, output)
            }
        }

        return {
            positions: new Float32Array(output.positions),
            sizes: new Float32Array(output.sizes),
            colors: new Float32Array(output.colors),
            normals: new Float32Array(output.normals),
        }

    }

    private constructPoint(
        x: number,
        y: number,
        pixels: Uint8ClampedArray,
        imageWidth: number,
        imageHeight: number,
        depthData: StreetViewDepthData,
        output: PointCloudOutputOutputBuffer
    ) {
        const w = depthData.header.width;
        const h = depthData.header.height;
        const planeID = depthData.indices[y * w + x];
        const splatBelongsToSky = planeID === 0;
        if (splatBelongsToSky) {
            return; // point does not belong to a plane
        }

        let direction = this.getPointDirection(x, y, w, h);
        const plane = depthData.planes[planeID];
        let {t, size} = this.getPointDistanceAndSize(plane, direction);

        if (size > this.options.maxSplatSize) {
            return; // discard points that are too large
        }

        // color: map x and y to pixel position (depends on effective image size)
        let {r, g, b} = this.getPointColor(x, y, w, h, imageWidth, imageHeight, pixels);

        if (size < this.options.minSplatSize) {
            // try merging points
            let boxSize = Math.ceil(this.options.minSplatSize / size);
            boxSize = Math.min(boxSize, h - y);
            boxSize = Math.min(boxSize, w - x);
            for (let dx = 0; dx < boxSize; dx++) {
                for (let dy = 0; dy < boxSize; dy++) {
                    if (depthData.indices[(y+dy) * w + (x+dx)] !== planeID) {
                        // point within the box has a different plane -> reduce box
                        boxSize = Math.min(boxSize, dx);
                        boxSize = Math.min(boxSize, dy);
                    }
                }
            }

            if (boxSize > 1) { // merge all points within the box into a single point
                // -> direction is the center of the box
                // -> position results from it
                // -> size scaled by box size
                direction = this.getPointDirection(x + (boxSize - 1) / 2, y + (boxSize - 1) / 2, w, h);
                const tAndSize = this.getPointDistanceAndSize(plane, direction);
                t = tAndSize.t;
                size = tAndSize.size * boxSize;

                // color average
                r = 0;
                g = 0;
                b = 0;
                for (let dx = 0; dx < boxSize; dx++) {
                    for (let dy = 0; dy < boxSize; dy++) {
                        // mark precessed point as sky -> will not get created in further iterations
                        depthData.indices[(y+dy) * w + (x+dx)] = 0;
                        const color = this.getPointColor(x + dx, y + dy, w, h, imageWidth, imageHeight, pixels);
                        r += color.r;
                        g += color.g;
                        b += color.b;
                    }
                }
                r /= boxSize * boxSize;
                g /= boxSize * boxSize;
                b /= boxSize * boxSize;

            }
        }

        output.positions.push(direction.px * t, direction.py * t, direction.pz * t);
        output.sizes.push(size);
        output.colors.push(r, g, b);
        output.normals.push(-plane.normal[0], -plane.normal[1], -plane.normal[2]);

    }

    private getPointDirection(x: number, y: number, w: number, h: number): {px: number, py: number, pz: number} {
        const phi = (w - x - 1) / (w - 1) * 2 * Math.PI + Math.PI / 2;
        const theta = (h - y - 1) / (h - 1) * Math.PI;

        const px = Math.sin(theta) * Math.cos(phi);
        const py = Math.sin(theta) * Math.sin(phi);
        const pz = Math.cos(theta);

        return {px, py, pz};
    }

    private getPointColor(x: number, y: number, w: number, h: number, imageWidth: number, imageHeight: number, pixels: Uint8ClampedArray) {
        const pixelX = Math.floor(x * (imageHeight - 1) / (h - 1));
        const pixelY = Math.floor(y * (imageWidth - 1) / (w - 1));
        const startIndex = 4 * (pixelY * w + pixelX);

        const r = pixels[startIndex] / 255;
        const g = pixels[startIndex + 1] / 255;
        const b = pixels[startIndex + 2] / 255;

        return {r, g, b};
    }

    getPointDistanceAndSize(plane: { normal: [number, number, number], distance: number }, direction: {px: number, py: number, pz: number}) {
        const splatScale = 0.02;
        const {px, py, pz} = direction;
        const normalDotDirection = px * plane.normal[0] + py * plane.normal[1] + pz * plane.normal[2];

        const t = plane.distance / normalDotDirection;

        // size correction based on orientation:
        // 1 / cos (angle between normal and ray to point) = 1 / dot product (normal, ray to point)
        const orientationCorrection = 1 / Math.abs(normalDotDirection);
        const distanceCorrection = Math.abs(t) + 0.001;
        const size = splatScale * distanceCorrection * orientationCorrection;

        return {t, size};
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
