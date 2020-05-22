import { OrbitAnimationController } from '../../lib/controllers/camera/orbit-animation-controller';
import { DynamicStreetViewController } from '../../lib/controllers/dynamic-street-view/dynamic-street-view-controller';
import { GoogleStreetViewApi } from '../../lib/data/street-view/api/google-street-view-api';
import { StreetViewLoader } from '../../lib/data/street-view/street-view-loader';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export class DynamicStreetViewDemo implements DemoBase {

    preferredMovementSpeed: number = 10;

    controller: DynamicStreetViewController;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
    ) {
        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.elevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const api = new GoogleStreetViewApi();
        const loader = new StreetViewLoader(api, 0.4, 1.5);
        this.controller = new DynamicStreetViewController(renderer, loader, 100, 's6A9P5A3iWvqNscixSRPsw');
    }

}
