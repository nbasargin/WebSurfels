import { vec3 } from 'gl-matrix';
import { StreetViewLoader } from '../../data/street-view/street-view-loader';
import { StreetViewPanorama } from '../../data/street-view/street-view-panorama';
import { Renderer } from '../../renderer/renderer';
import { RendererNode } from '../../renderer/renderer-node';
import { DynamicStreetViewNode } from './dynamic-street-view-node';

export class DynamicStreetViewController {

    private toBeLoaded: Set<string> = new Set();
    private loading: Set<string> = new Set();

    // loaded data, waiting for overlap reduction and lod construction
    private loadedWaitingForNeighbors: Map<string, StreetViewPanorama> = new Map();
    private streetViewNodes: Map<string, DynamicStreetViewNode> = new Map();

    // tracks centers of all panoramas (in object space) ever loaded and processed
    private panoCenters: Map<string, {x: number, y: number, z: number}> = new Map();
    private basePanoWorldPosition: {x: number, y: number, z: number};

    constructor(
        public renderer: Renderer,
        public loader: StreetViewLoader,
        public qualityDist: number, // distance within highest quality will be used
        startPanoramaID: string,
    ) {
        // asynchronously load base panorama and set camera orientation
        loader.loadPanorama(startPanoramaID).then(basePanorama => {
            const pos = basePanorama.worldPosition;
            this.basePanoWorldPosition = pos;
            const up = vec3.fromValues(pos.x, pos.y, pos.z);
            vec3.normalize(up, up);
            this.renderer.camera.setUpVector(up);
            this.processLoadedPanorama(basePanorama);
        });
    }

    render() {
        const toRemove: Array<string> = [];
        const renderList: Array<RendererNode> = [];
        const cam = this.renderer.camera.eye;

        // iterate over all loaded panoramas
        for (const pano of this.streetViewNodes.values()) {
            // const pos = pano.worldPosition;
            // const dist = Math.sqrt((cam[0] - pos.x) ** 2 + (cam[1] - pos.y) ** 2 + (cam[2] - pos.z) ** 2);

            // determine appropriate lod level based on qualityDist
            // if (dist < this.qualityDist) {
                // original quality
                const node = pano.lod.original;
                const s = node.boundingSphere;
                if (this.renderer.camera.isSphereInFrustum(s.centerX, s.centerY, s.centerY, s.radius)) {
                    renderList.push(node.rendererNode);
                }
            //}
            // todo other qualities

            // if node too far away (lod below low), remove it from renderer
            // todo update to remove for nodes far

            // else: request loading of missing neighbors if lod level is higher than low
        }

        // render
        this.renderer.render(renderList);

        // loading logic: fire requests, update sets
        if (this.toBeLoaded.size > 0 && this.loading.size < 10) {
            const first = this.toBeLoaded.values().next().value;
        }

    }


    private startLoading(id: string) {
        this.toBeLoaded.delete(id);
        if (this.loading.has(id) || this.loadedWaitingForNeighbors.has(id) || this.streetViewNodes.has(id)) {
            return;
        }
        this.loading.add(id);
        this.loader.loadPanorama(id).then(pano => {
            this.loading.delete(id);
            this.processLoadedPanorama(pano);
        }).catch(error => {
            this.loading.delete(id);
            console.error(error);
        });
    }

    private processLoadedPanorama(pano: StreetViewPanorama) {
        // get panorama center in object space (current world  -  base world)
        const centerPos = {
            x: pano.worldPosition.x - this.basePanoWorldPosition.x,
            y: pano.worldPosition.y - this.basePanoWorldPosition.y,
            z: pano.worldPosition.z - this.basePanoWorldPosition.z,
        };
        this.panoCenters.set(pano.id, centerPos);

        // translate panorama and bounding sphere to correct position
        const positions = pano.data.positions;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += centerPos.x;
            positions[i + 1] += centerPos.y;
            positions[i + 2] += centerPos.z;
        }
        pano.boundingSphere.centerX = centerPos.x;
        pano.boundingSphere.centerY = centerPos.y;
        pano.boundingSphere.centerZ = centerPos.z;

        // check if all neighbors are available, if not, wait until they are loaded


    }

}
