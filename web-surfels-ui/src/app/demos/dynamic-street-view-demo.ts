import { OrbitAnimationController } from '../../lib/controllers/camera/orbit-animation-controller';
import { DynamicStreetViewController } from '../../lib/controllers/dynamic-street-view/dynamic-street-view-controller';
import { LocalStreetViewApi } from '../../lib/data/street-view/api/local-street-view-api';
import { StreetViewLoader } from '../../lib/data/street-view/street-view-loader';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export class DynamicStreetViewDemo implements DemoBase {

    preferredMovementSpeed: number = 10;

    controller: DynamicStreetViewController;

    datasets = {
        paris25k: {
            path: 'paris25k',
            startID: 'PxH7e1kCSV7p728tziDR_w'
        },
        manhattan5k: {
            path: 'manhattan5k',
            startID: 'h--IJXCoiMfBaHbDmPPKKg',
        }
    };

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
    ) {
        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.cameraElevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const data = this.datasets.paris25k;

        // const api = new GoogleStreetViewApi();
        const api = new LocalStreetViewApi(`http://localhost:5000/${data.path}`);
        const loader = new StreetViewLoader(api, 0.4, 1.5);
        this.controller = new DynamicStreetViewController(renderer, loader, 50, 300, {
            softMinimum: 100_000_000,
            softMaximum: 120_000_000
        }, data.startID);
    }

}
