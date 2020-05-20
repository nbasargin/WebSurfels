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
            this.completePanoramaLoading(basePanorama);
        });
    }


    /**
     * Request panorama loading.
     * Does nothing if:
     *  - there is already a request
     *  - it is already loading
     *  - it is already loaded and waiting
     *  - it is already processed and transferred to the GPU
     * @param id
     */
    private requestPanoramaLoading(id: string) {
        if (this.toBeLoaded.has(id) || this.loading.has(id) || this.loadedWaitingForNeighbors.has(id) || this.streetViewNodes.has(id)) {
            return;
        }
        this.toBeLoaded.add(id);
    }

    private startPanoramaLoading(id: string) {
        this.toBeLoaded.delete(id);
        if (this.loading.has(id) || this.loadedWaitingForNeighbors.has(id) || this.streetViewNodes.has(id)) {
            return;
        }
        console.log('!! start loading', id);
        this.loading.add(id);
        this.loader.loadPanorama(id).then(pano => {
            this.loading.delete(pano.id);
            this.completePanoramaLoading(pano);
        }).catch(error => {
            this.loading.delete(id);
            console.error(error);
        });
    }

    private completePanoramaLoading(pano: StreetViewPanorama) {
        // adjust panorama position
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

        // place into waiting for neighbors
        this.loadedWaitingForNeighbors.set(pano.id, pano);
    }

    //
    // Each Frame
    //

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

        this.updateLoadingRequests();
        this.updateWaitingPanoramas();
    }

    private updateLoadingRequests() {
        for (const id of this.toBeLoaded) {
            if (this.loading.size < 10) {
                this.startPanoramaLoading(id);
            } else {
                break;
            }
        }
    }

    /**
     * Iterate over all waiting panoramas, process those with neighbors available.
     * Processing panoramas includes:
     *  - overlap removal (Voronoi like diagram)
     *  - LOD generation
     *  - creation of corresponding renderer nodes (data on GPU)
     *  - removal of the original data from the CPU
     */
    private updateWaitingPanoramas() {

        for (const pano of this.loadedWaitingForNeighbors.values()) {
            let allLinksAvailable = true;
            for (const link of pano.links) {
                if (!this.panoCenters.has(link)) {
                    // todo: PROBLEM this will never stop loading new nodes, regardless of their distance to the camera
                    // need to do requests based on position

                    this.requestPanoramaLoading(link);
                    allLinksAvailable = false;
                }
            }

            if (!allLinksAvailable) {
                continue;
            }

            // this panorama has all links -> do overlap reduction, lod etc.
            // todo all optimizations
            // for now: simply put to the GPU
            const dynamicNode: DynamicStreetViewNode = {
                id: pano.id,
                links: pano.links,
                center: this.panoCenters.get(pano.id)!,
                lod: {
                    original: {
                        rendererNode: this.renderer.addData(pano.data),
                        boundingSphere: null as any
                    },
                    // todo other lods and bounding spheres
                } as any,
            };

            this.streetViewNodes.set(pano.id, dynamicNode);
            this.loadedWaitingForNeighbors.delete(pano.id);
        }
    }

}
