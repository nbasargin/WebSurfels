
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

    constructPointCloud(colorData: ImageBitmap, depthData: DepthData, skyDistance: number = -1):PointCloudData {
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
                if (planeID === 0 && skyDistance <= 0) {
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

                // color
                const r = pixels[4 * (y * w + x)] / 255;
                const g = pixels[4 * (y * w + x) + 1] / 255;
                const b = pixels[4 * (y * w + x) + 2] / 255;

                positions.push(px * t, py * t, pz * t);
                sizes.push(0.02 * Math.abs(t)); // todo size based on distance AND orientation (with some limit)
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
