import { vec3 } from "gl-matrix";
import { PointCloudDataGenerator } from '../../lib/data/point-cloud-data-generator';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export class SphereDemo implements DemoBase {

    preferredMovementSpeed = 1;

    presets: Array<{points: number, size: number}> = [
        {points: 300000, size: 0.02},
        {points: 30000, size: 0.05},
        {points: 3000, size: 0.2},
    ];

    constructor(public renderer: Renderer) {
        this.renderer.camera.setOrientation(
            vec3.fromValues(3, 0, 0),
            vec3.fromValues(0, 0, 0),
            vec3.fromValues(0, 0,1)
        );
        this.addSphere(this.presets[0]);
    }

    addSphere(preset: {points: number, size: number}) {
        this.renderer.removeAllNodes();
        const data = PointCloudDataGenerator.generateSphere(preset.points, preset.size);
        this.renderer.addData(data);
    }
}
