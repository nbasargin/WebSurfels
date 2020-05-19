import { DummyData } from '../../lib/utils/dummy-data';
import { OrbitAnimationController } from '../../lib/controllers/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export class SphereDemo implements DemoBase {

    preferredMovementSpeed = 1;

    presets: Array<{ points: number, size: number }> = [
        {points: 300000, size: 0.02},
        {points: 30000, size: 0.05},
        {points: 3000, size: 0.2},
    ];

    constructor(
        public renderer: Renderer,
        public orbitAnimation: OrbitAnimationController
    ) {
        this.orbitAnimation.minDistance = 2;
        this.orbitAnimation.maxDistance = 3;
        this.orbitAnimation.elevation = 0;
        this.orbitAnimation.rotationDuration = 25000 * this.preferredMovementSpeed;
        this.orbitAnimation.animate(12000);

        this.addSphere(this.presets[0]);
    }

    addSphere(preset: { points: number, size: number }) {
        this.renderer.removeAllNodes();
        const data = DummyData.generateSphere(preset.points, preset.size);
        this.renderer.addData(data);
    }
}
