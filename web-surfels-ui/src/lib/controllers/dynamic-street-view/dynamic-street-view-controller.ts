import { vec3 } from 'gl-matrix';
import { StreetViewLoader } from '../../data/street-view/street-view-loader';
import { StreetViewPanorama } from '../../data/street-view/street-view-panorama';
import { Renderer } from '../../renderer/renderer';
import { RendererNode } from '../../renderer/renderer-node';
import { DynamicStreetViewNode } from './dynamic-street-view-node';

export class DynamicStreetViewController {

    maxConcurrentApiRequests = 3;
    minVisiblePanoramas = 10;
    maxLoadedPanoramas = 1000;

    private requested: Set<string> = new Set();
    private loading: Set<string> = new Set();

    private streetViewNodes: Map<string, DynamicStreetViewNode> = new Map();
    private visiblePanoramas: number = 0; // keep track how many potentially visible panoramas there are

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
        if (this.loading.has(id) || this.streetViewNodes.has(id)) {
            return;
        }
        this.requested.add(id);
    }

    private startPanoramaLoading(id: string) {
        this.requested.delete(id);
        if (this.loading.has(id) || this.streetViewNodes.has(id)) {
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

        console.log('!! complete loading', pano.id);
        this.streetViewNodes.set(pano.id, {
            id: pano.id,
            state: 'waitingForNeighbors',
            center: centerPos,
            links: pano.links,
            data: pano.data,
        });
    }

    /**
     * Process panorama only when all neighbors are available.
     * Processing includes:
     *  - overlap removal (Voronoi like diagram)
     *  - LOD generation
     *  - creation of corresponding renderer nodes (data on GPU)
     *  - removal of the original data from the CPU
     * @param node
     */
    private processWaitingNode(node: DynamicStreetViewNode) {
        if (node.state !== 'waitingForNeighbors') {
            return;
        }
        for (const link of node.links) {
            if (!this.panoCenters.has(link)) {
                return; // some centers are missing, wait until they are loaded
            }
        }

        // this panorama has all links -> do overlap reduction, lod etc.
        // todo all optimizations
        // for now: simply put to the GPU
        const newNode: DynamicStreetViewNode = {
            id: node.id,
            state: 'rendering',
            links: node.links,
            center: node.center,
            lod: {
                original: {
                    rendererNode: this.renderer.addData(node.data),
                    boundingSphere: null as any
                },
                // todo other lods and bounding spheres
            } as any,
        };
        this.streetViewNodes.set(node.id, newNode);

    }

    //
    // Each Frame
    //

    render() {
        const renderList: Array<RendererNode> = [];
        const cam = this.renderer.camera.eye;
        let visiblePanoramas = 0;

        // iterate over all loaded panoramas
        for (const node of this.streetViewNodes.values()) {
            const pos = node.center;
            const dist = Math.sqrt((cam[0] - pos.x) ** 2 + (cam[1] - pos.y) ** 2 + (cam[2] - pos.z) ** 2);

            // Appropriate LOD level is based on qualityDist:
            //  0 * qualityDist to 1 * qualityDist  ->  original
            //  1 * qualityDist to 2 * qualityDist  ->  high
            //  2 * qualityDist to 4 * qualityDist  ->  medium
            //  4 * qualityDist to 8 * qualityDist  ->  medium
            //  8 * qualityDist or higher           ->  unload

            if (dist > 8 * this.qualityDist && this.visiblePanoramas > this.minVisiblePanoramas) {
                console.log('!! removing ', node.id);
                this.streetViewNodes.delete(node.id);
                continue;
            }

            if (dist < 4 * this.qualityDist) {
                // load missing links
                for (const link of node.links) {
                    this.requestPanoramaLoading(link);
                }
            }

            if (node.state === 'rendering') {
                visiblePanoramas++;

                // todo select quality
                const rendererNode = node.lod.original;
                // todo frustum culling
                //const s = rendererNode.boundingSphere;
                //if (this.renderer.camera.isSphereInFrustum(s.centerX, s.centerY, s.centerY, s.radius)) {
                    renderList.push(rendererNode.rendererNode);
                //}


            } else if (node.state === 'waitingForNeighbors') {
                this.processWaitingNode(node);
            }

        }
        this.visiblePanoramas = visiblePanoramas;

        // render
        this.renderer.render(renderList);

        // send loading requests
        for (const id of this.requested) {
            if (this.loading.size < this.maxConcurrentApiRequests
                && this.requested.size + this.loading.size + this.streetViewNodes.size < this.maxLoadedPanoramas) {
                this.startPanoramaLoading(id);
            } else {
                break;
            }
        }
    }

}
