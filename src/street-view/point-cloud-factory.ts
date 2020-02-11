import { PointCloudData } from '../point-cloud-rendering/data/point-cloud-data';
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

    constructPointCloud(colorData: ImageBitmap, depthData: DepthData):PointCloudData {
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
                if (planeID === 0) {
                    continue; // point does not belong to a plane
                }

                const phi = (w - x - 1) / (w - 1) * 2 * Math.PI; // + Math.PI/2
                const theta = (h - y - 1) / (h - 1) * Math.PI;

                const px = Math.sin(theta) * Math.cos(phi);
                const py = Math.sin(theta) * Math.sin(phi);
                const pz = Math.cos(theta);

                const plane = depthData.planes[planeID];
                const t = plane.distance / (px * plane.normal[0] + py * plane.normal[1] + pz * plane.normal[2]);

                positions.push(px * t, py * t, pz * t);
                sizes.push(0.03 * Math.abs(t)); // todo size based on distance (with some limit)
                colors.push(1, 1, 1); // todo: extract from color data
                normals.push(... plane.normal)
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
