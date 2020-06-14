import { vec3 } from 'web-surfels';
import { OrbitAnimationController } from 'web-surfels/lib/src/controllers/camera/orbit-animation-controller';
import { GoogleStreetViewApi } from 'web-surfels/lib/src/data/street-view/api/google-street-view-api';
import { StreetViewLoader } from 'web-surfels/lib/src/data/street-view/street-view-loader';
import { StreetViewPanorama } from 'web-surfels/lib/src/data/street-view/street-view-panorama';
import { Renderer } from 'web-surfels/lib/src/renderer/renderer';
import { DemoBase } from './demo-base';

export class StreetViewPointMergingDemo implements DemoBase {

    preferredMovementSpeed = 1;

    nodeOptimized: StreetViewPanorama;
    nodeRaw: StreetViewPanorama;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
    ) {
        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.cameraElevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const api = new GoogleStreetViewApi();
        const loaderOptimized = new StreetViewLoader(api, 0.4, 3);
        const loaderRaw = new StreetViewLoader(api, 0, 3);
        const panoID = 'z3tpeZzLuXsdj-etXNqmTw';

        loaderOptimized.loadPanorama(panoID).then(p => {
            this.nodeOptimized = p;
            const pos = p.worldPosition;
            const up = vec3.fromValues(pos.x, pos.y, pos.z);
            vec3.normalize(up, up);
            this.renderer.camera.setUpVector(up);
            return loaderRaw.loadPanorama(panoID);
        }).then(p => {
            this.nodeRaw = p;
        });
    }

    showRaw() {
        this.renderer.removeAllNodes();
        if (this.nodeRaw) {
            this.renderer.addData(this.nodeRaw.data);
        }
    }

    showOptimized() {
        this.renderer.removeAllNodes();
        if (this.nodeOptimized) {
            this.renderer.addData(this.nodeOptimized.data);
        }
    }

}
