import { vec3 } from 'gl-matrix';
import { DynamicLodController } from '../../lib/controllers/dynamic-lod/dynamic-lod-controller';
import { XhrLodLoader } from '../../lib/controllers/dynamic-lod/xhr-lod-loader';
import { OrbitAnimationController } from '../../lib/controllers/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export class DynamicLodLoadingDemo implements DemoBase {

    preferredMovementSpeed = 10;

    dynamicLod: DynamicLodController;
    initialSizeThreshold = 1.4;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,

    ) {
        this.renderer.camera.setUpVector(vec3.fromValues(0, 1, 0));

        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.elevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const loader = new XhrLodLoader('http://localhost:5000/');
        this.dynamicLod = new DynamicLodController(this.renderer, loader, this.initialSizeThreshold);
    }

}
