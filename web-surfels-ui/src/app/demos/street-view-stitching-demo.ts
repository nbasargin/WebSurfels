import { vec3 } from 'gl-matrix';
import { OrbitAnimationController } from '../../lib/renderer/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { GSVPanoramaLoader } from '../../lib/street-view/gsv-panorama-loader';

export class StreetViewStitchingDemo {

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,
        panoIDs: Array<string>
    ) {
        this.run(panoIDs).catch(console.error);
    }

    async run(panoIDs: Array<string>) {
        this.renderer.removeAllNodes();

        const options = {
            skyDistance: -1,
            maxNonSkySplatSize: 1,
            minNonSkySplatSize: 0.2,
        };
        const loader = new GSVPanoramaLoader(options);

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
            /*
            const subgrid = new Subgrid(64, 1);
            for (const p of panoramas) {
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
            }*/

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
