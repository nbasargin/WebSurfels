
import { PointCloudData } from '../data/point-cloud-data';
import { DepthData } from './depth-data';

export class PointCloudFactory {

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 512;  // optionally, shrink height to 256
        this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    }

    /**
     * Constructs point cloud from given color and depth data.
     *
     * @param colorData
     * @param imageWidth - effective image width (typically 416 or 512), can be computed with image_width / (2 ^ num_zoom_levels)
     * @param imageHeight - effective image height (typically 208 or 416), can be computed with image_height / (2 ^ num_zoom_levels)
     * @param depthData
     * @param skyDistance - distance for sky splats (= splats not assigned to a plane), if below 0 sky splats are dropped
     * @param nonSkySplatSizeLimit - size limit for non-sky splats, non-sky splats larger than this are dropped
     */
    constructPointCloud(colorData: ImageBitmap, imageWidth: number, imageHeight: number, depthData: DepthData, skyDistance: number = -1, nonSkySplatSizeLimit = 5):PointCloudData {
        const splatScale = 0.02;

        this.ctx.drawImage(colorData, 0, 0);
        const pixels = this.ctx.getImageData(0, 0, 512, 512).data;  // optionally, shrink height to 256

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
                if (splatBelongsToSky && skyDistance <= 0) {
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
                    t = -skyDistance;
                    plane = {normal: [-px, -py, -pz], distance: 0}
                }

                // size correction based on orientation:
                // 1 / cos (angle between normal and ray to point) = 1 / dot product (normal, ray to point)
                const orientationCorrection = 1 / Math.abs(px * plane.normal[0] + py * plane.normal[1] + pz * plane.normal[2]);
                const distanceCorrection = Math.abs(t) + 0.001;
                const size = splatScale * distanceCorrection * orientationCorrection;
                if (size > nonSkySplatSizeLimit && !splatBelongsToSky) {
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


}
