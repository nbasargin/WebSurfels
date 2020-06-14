import { DummyData } from '../../lib/utils/dummy-data';
import { OrbitAnimationController } from '../../lib/controllers/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export class SphereDemo implements DemoBase {

    preferredMovementSpeed = 1;

    // sphere surface = 4 pi R^2 = 4 pi
    // Goal: N * splat area = 4 * sphere surface
    // N * pi * (splat size / 2)^2 = 4 * 4 pi
    // N * splat size^2 / 4 = 4 * 4
    // splat size = sqrt(4 * 4 * 4 / N) = 8 sqrt (1 / N)
    presets: Array<{ points: number, size: number }> = [10_000, 100_000, 1_000_000, 10_000_000]
        .map(n => ({points: n, size: 8 * Math.sqrt(1 / n)}));

    constructor(
        public renderer: Renderer,
        public orbitAnimation: OrbitAnimationController
    ) {
        this.orbitAnimation.minDistance = 2;
        this.orbitAnimation.maxDistance = 3;
        this.orbitAnimation.cameraElevation = 0;
        this.orbitAnimation.rotationDuration = 25000 * this.preferredMovementSpeed;
        this.orbitAnimation.animate(12000);

        this.addSphere(this.presets[0]);
    }

    addSphere(preset: { points: number, size: number }) {
        this.renderer.removeAllNodes();
        const data = DummyData.generateSphere(preset.points, preset.size);
        this.renderer.addData(data);
    }

    nearCam() {
        const cam = this.renderer.camera;
        cam.setEyePosition([-1.25, 0, 0]);
    }

    farCam() {
        const cam = this.renderer.camera;
        cam.setEyePosition([-2.1, 0, 0]);
    }
}
