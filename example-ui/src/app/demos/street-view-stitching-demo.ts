import { vec3 } from 'web-surfels';
import { Subgrid } from 'web-surfels/lib/data/level-of-detail/subgrid';
import { OrbitAnimationController } from 'web-surfels/lib/controllers/camera/orbit-animation-controller';
import { GoogleStreetViewApi } from 'web-surfels/lib/data/street-view/api/google-street-view-api';
import { StreetViewLoader } from 'web-surfels/lib/data/street-view/street-view-loader';
import { Renderer } from 'web-surfels/lib/renderer/renderer';
import { StreetViewCrawler } from 'web-surfels/lib/data/street-view/street-view-crawler';
import { BoundingCube } from 'web-surfels/lib/utils/bounding-geometry';
import { DemoBase } from './demo-base';

export type PanoramaInput = {
    type: 'static',
    panoIDs: Iterable<string>
} | {
    type: 'crawl',
    startID: string,
    bfsLimit: number
}

export class StreetViewStitchingDemo implements DemoBase {

    preferredMovementSpeed = 10;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
        private reducePointNumber: boolean = false,
        input: PanoramaInput
            // = {type: 'crawl', startID: StreetViewCrawler.crawls.manhattan[0], bfsLimit: 30},
             = {type: 'static', panoIDs: StreetViewCrawler.crawls.manhattan.slice(0, 16)},
    ) {
        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.cameraElevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;


        if (input.type === 'static') {
            this.run(input.panoIDs).catch(console.error);
        } else {
            const crawler = new StreetViewCrawler();
            crawler.crawl(input.startID, input.bfsLimit).then(ids => {
                console.log('crawl complete, found', ids.size, 'panoramas');
                console.log('ids', ids);
                this.run([... ids.values()]).catch(console.error);
            });
        }

    }

    async run(panoIDs: Iterable<string>) {
        this.renderer.removeAllNodes();

        const api = new GoogleStreetViewApi();
        const loader = new StreetViewLoader(api, 0.2, 1);

        // set up camera and coordinate system based on first panorama
        const basePanorama = await loader.loadPanorama(panoIDs[0]);
        const pos = basePanorama.worldPosition;
        const up = vec3.fromValues(pos.x, pos.y, pos.z);
        vec3.normalize(up, up);
        this.renderer.camera.setUpVector(up);
        this.orbitAnimation.animate(0);

        // load others one after one (reduces cpu load when receiving)
        for (const id of panoIDs) {
            const p = await loader.loadPanorama(id);

            // test: reduce number of points per panorama
            if (this.reducePointNumber) {
                const subgrid = new Subgrid(64, 1);
                const bc: BoundingCube = {
                    size: p.boundingSphere.radius * 2,
                    minX: p.boundingSphere.centerX - p.boundingSphere.radius,
                    minY: p.boundingSphere.centerY - p.boundingSphere.radius,
                    minZ: p.boundingSphere.centerZ - p.boundingSphere.radius,
                };
                const weights = new Float32Array(p.data.positions.length / 3);
                weights.fill(1);
                const reduced = subgrid.reduce({...p.data, weights}, bc);
                console.log('data reduction', p.data.positions.length / 3, ' --> ', reduced.positions.length / 3, 'points');

                p.data = reduced;
            }

            // compute offset
            const x = p.worldPosition.x - basePanorama.worldPosition.x;
            const y = p.worldPosition.y - basePanorama.worldPosition.y;
            const z = p.worldPosition.z - basePanorama.worldPosition.z;

            const positions = p.data.positions;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += x;
                positions[i + 1] += y;
                positions[i + 2] += z;
            }
            this.renderer.addData(p.data);
        }

    }

}