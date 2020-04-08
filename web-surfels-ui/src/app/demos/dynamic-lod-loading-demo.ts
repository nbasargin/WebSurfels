import { vec3 } from 'gl-matrix';
import { DynamicLodTree } from '../../dynamic-lod/dynamic-lod-tree';
import { XhrLodLoader } from '../../dynamic-lod/xhr-lod-loader';
import { OrbitAnimationController } from '../../lib/renderer/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export class DynamicLodLoadingDemo implements DemoBase {

    preferredMovementSpeed = 10;

    dynamicLod: DynamicLodTree;
    initialSizeThreshold = 1.4;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,

    ) {
        this.renderer.camera.setUpVector(vec3.fromValues(0, 1, 0));

        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.elevation = 30;
        this.orbitAnimation.rotationDuration = 15000;

        this.orbitAnimation.animate(0);

        const loader = new XhrLodLoader('http://localhost:5000/');
        this.dynamicLod = new DynamicLodTree(this.renderer, loader, this.initialSizeThreshold);
    }

}
