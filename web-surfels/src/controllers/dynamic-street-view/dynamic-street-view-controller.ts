import { vec3 } from 'gl-matrix';
import { Subgrid } from '../../data/level-of-detail/subgrid';
import { PointCloudData, WeightedPointCloudData } from '../../data/point-cloud-data';
import { StreetViewLoader } from '../../data/street-view/street-view-loader';
import { StreetViewPanorama } from '../../data/street-view/street-view-panorama';
import { Renderer } from '../../renderer/renderer';
import { RendererNode } from '../../renderer/renderer-node';
import { RenderingStats } from '../../renderer/rendering-stats';
import { BoundingBox, BoundingCube, BoundingSphere } from '../../utils/bounding-geometry';
import { Point3d } from '../../utils/point3d';
import { DynamicStreetViewNode, PanoramaLOD } from './dynamic-street-view-node';

export interface PointBudgets {
    softMinimum: number;
    softMaximum: number;
}

export class DynamicStreetViewController {

    maxConcurrentApiRequests = 3;

    pointsInMemory = 0;

    pauseLoading = false;
    errorLoadingRoot = false;

    private requested: Map<string, Point3d> = new Map();
    private loading: Set<string> = new Set();
    private errors: Map<string, number> = new Map();
    private destroyed: boolean = false;

    private streetViewNodes: Map<string, DynamicStreetViewNode> = new Map();
    private visiblePanoramas: number = 0; // keep track how many potentially visible panoramas there are

    // tracks centers of all panoramas (in object space) ever loaded and processed
    private panoCenters: Map<string, Point3d> = new Map();
    private basePanoWorldPosition: Point3d;

    // lod construction
    private subgrid128 = new Subgrid(128);
    private subgrid64 = new Subgrid(64);
    private subgrid32 = new Subgrid(32);
    // todo refactor subgrid to allow input without weights
    private oneWeights = new Float32Array(512 * 256).fill(1);

    private loadingDistFactor: number = 2; // this factor times qualityDist is the loading dist

    constructor(
        public renderer: Renderer,
        public loader: StreetViewLoader,
        public qualityDist: number, // distance within highest quality will be used and all panoramas must be loaded
        public pointLoadingBudgets: PointBudgets,
        startPanoramaID: string,
    ) {
        // asynchronously load base panorama and set camera orientation
        loader.loadPanorama(startPanoramaID).then(basePanorama => {
            if (this.destroyed) {
                return;
            }
            const pos = basePanorama.worldPosition;
            this.basePanoWorldPosition = pos;
            const up = vec3.fromValues(pos.x, pos.y, pos.z);
            vec3.normalize(up, up);
            this.renderer.camera.setUpVector(up);
            this.completePanoramaLoading(basePanorama);
        }).catch(error => {
            console.error(error);
            this.errorLoadingRoot = true;
        });
    }

    /**
     * Forget about all previous network errors.
     * Use to resume loading after a lost connection to the server.
     */
    forgetPreviousNetworkErrors() {
        this.errors.clear();
    }

    hasNetworkErrors(): boolean {
        return this.errors.size > 0;
    }

    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
    }

    /**
     * Request panorama loading.
     * Does nothing if:
     *  - there is already a request
     *  - it is already loading
     *  - it is already loaded and waiting
     *  - it is already processed and transferred to the GPU
     * @param id
     * @param requesterCenter   center of some neighboring panorama, used to prioritize the loading order
     */
    private requestPanoramaLoading(id: string, requesterCenter: Point3d) {
        if (this.requested.has(id) || this.loading.has(id) || this.streetViewNodes.has(id)) {
            return;
        }
        if ((this.errors.get(id) || 0) > 3) {
            return; // ignore requests for panoramas that have to many errors
        }
        if (this.panoCenters.has(id)) {
            // if panorama was already loaded before, use its center instead of the neighbor
            requesterCenter = this.panoCenters.get(id)!;
        }
        this.requested.set(id, requesterCenter);
    }

    private startPanoramaLoading(id: string) {
        this.requested.delete(id);
        if (this.loading.has(id) || this.streetViewNodes.has(id)) {
            return;
        }
        // console.log('!! start loading', id);
        this.loading.add(id);
        this.loader.loadPanorama(id).then(pano => {
            if (this.destroyed) {
                return;
            }
            this.loading.delete(pano.id);
            this.completePanoramaLoading(pano);
        }).catch(error => {
            this.loading.delete(id);
            const errorCount = this.errors.has(id) ? this.errors.get(id)! : 0;
            this.errors.set(id, errorCount + 1);
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

        // overlap reduction
        const centers = node.links.map(link => this.panoCenters.get(link)!);
        const data = this.reduceOverlaps(node.data, node.center, centers);

        // LOD
        const bb = BoundingBox.create(data.positions, data.sizes);
        const bc = BoundingCube.fromBox(bb);
        const weightedData: WeightedPointCloudData = {
            ...data,
            weights: this.oneWeights
        };
        const data128 = this.subgrid128.reduce(weightedData, bc);
        const data64 = this.subgrid64.reduce(weightedData, bc);
        const data32 = this.subgrid32.reduce(weightedData, bc);

        // add the node to the renderer
        const newNode: DynamicStreetViewNode = {
            id: node.id,
            state: 'rendering',
            links: node.links,
            center: node.center,
            lod: {
                original: {
                    rendererNode: this.renderer.addData(data),
                    boundingSphere: BoundingSphere.create(data.positions, data.sizes)
                },
                high: {
                    rendererNode: this.renderer.addData(data128),
                    boundingSphere: BoundingSphere.create(data128.positions, data128.sizes)
                },
                medium: {
                    rendererNode: this.renderer.addData(data64),
                    boundingSphere: BoundingSphere.create(data64.positions, data64.sizes)
                },
                low: {
                    rendererNode: this.renderer.addData(data32),
                    boundingSphere: BoundingSphere.create(data32.positions, data32.sizes)
                }
            },
        };

        this.pointsInMemory += newNode.lod.original.rendererNode.numPoints;
        this.pointsInMemory += newNode.lod.high.rendererNode.numPoints;
        this.pointsInMemory += newNode.lod.medium.rendererNode.numPoints;
        this.pointsInMemory += newNode.lod.low.rendererNode.numPoints;

        this.streetViewNodes.set(node.id, newNode);
    }

    private reduceOverlaps(data: PointCloudData, center: Point3d, centers: Array<Point3d>): PointCloudData {
        const filteredPositions: Array<number> = [];
        const filteredSizes: Array<number> = [];
        const filteredColors: Array<number> = [];
        const filteredNormals: Array<number> = [];
        const p = data.positions;

        // for every point, check if the (squared) distance to panorama center is closer than to all other centers
        for (let i = 0; i < p.length; i += 3) {
            const d = (center.x - p[i]) ** 2 + (center.y - p[i+1]) ** 2 + (center.z - p[i+2]) ** 2;
            let skip = false;
            for (const c of centers) {
                const d2 = (c.x - p[i]) ** 2 + (c.y - p[i+1]) ** 2 + (c.z - p[i+2]) ** 2;
                if (d2 < d) {
                    skip = true;
                    break;
                }
            }
            if (!skip) {
                filteredPositions.push(p[i], p[i+1], p[i+2]);
                filteredSizes.push(data.sizes[i/3]);
                filteredColors.push(data.colors[i], data.colors[i+1], data.colors[i+2]);
                filteredNormals.push(data.normals[i], data.normals[i+1], data.normals[i+2]);
            }
        }

        return {
            positions: new Float32Array(filteredPositions),
            sizes: new Float32Array(filteredSizes),
            colors: new Float32Array(filteredColors),
            normals: new Float32Array(filteredNormals),
        }
    }

    private unloadNode(node: DynamicStreetViewNode) {
        if (node.state === 'rendering') {
            this.pointsInMemory -= node.lod.original.rendererNode.numPoints;
            this.pointsInMemory -= node.lod.high.rendererNode.numPoints;
            this.pointsInMemory -= node.lod.medium.rendererNode.numPoints;
            this.pointsInMemory -= node.lod.low.rendererNode.numPoints;

            this.renderer.removeNode(node.lod.original.rendererNode);
            this.renderer.removeNode(node.lod.high.rendererNode);
            this.renderer.removeNode(node.lod.medium.rendererNode);
            this.renderer.removeNode(node.lod.low.rendererNode);
        }
        this.streetViewNodes.delete(node.id);
    }

    private nodeCameraDistance(node: DynamicStreetViewNode) {
        const cam = this.renderer.camera.eye;
        const pos = node.center;
        return Math.sqrt((cam[0] - pos.x) ** 2 + (cam[1] - pos.y) ** 2 + (cam[2] - pos.z) ** 2);
    }

    //
    // Each Frame
    //

    render(): RenderingStats {
        if (this.destroyed) {
            throw new Error('Calling render on destroyed DynamicStreetViewController!');
        }

        const renderList: Array<RendererNode> = [];
        const cam = this.renderer.camera.eye;
        let visiblePanoramas = 0;

        // iterate over all loaded panoramas
        for (const node of this.streetViewNodes.values()) {
            const dist = this.nodeCameraDistance(node);

            // Appropriate LOD level, link resolution and unloading is based on qualityDist times the threshold
            const originalThreshold = 1;
            const highThreshold = 4;
            const mediumThreshold = 8;

            // NEW
            if (dist < this.qualityDist * this.loadingDistFactor || this.pointsInMemory < this.pointLoadingBudgets.softMinimum) {
                // load missing links // todo optimize this (with allLinksLoaded flag)
                for (const link of node.links) {
                    this.requestPanoramaLoading(link, node.center);
                }
            }

            if (node.state === 'rendering') {
                visiblePanoramas++;

                let rendererNode: PanoramaLOD;
                if (dist < originalThreshold * this.qualityDist) {
                    rendererNode = node.lod.original;
                } else if (dist < highThreshold * this.qualityDist) {
                    rendererNode = node.lod.high;
                } else if (dist < mediumThreshold * this.qualityDist) {
                    rendererNode = node.lod.medium;
                } else {
                    rendererNode = node.lod.low;
                }

                const s = rendererNode.boundingSphere;
                if (this.renderer.camera.isSphereInFrustum(s.centerX, s.centerY, s.centerZ, s.radius)) {
                    renderList.push(rendererNode.rendererNode);
                }

            } else if (node.state === 'waitingForNeighbors') {
                this.processWaitingNode(node);
            }

        }
        this.visiblePanoramas = visiblePanoramas;

        // render
        const stats = this.renderer.render(renderList);

        // send loading requests: prioritize panoramas close to the camera
        while (
            !this.pauseLoading &&
            this.requested.size > 0 &&
            this.loading.size < this.maxConcurrentApiRequests
        ) {
            let minDist = Number.POSITIVE_INFINITY;
            let minID = '';

            for (const [id, center] of this.requested.entries()) {
                const dist = Math.sqrt((cam[0] - center.x) ** 2 + (cam[1] - center.y) ** 2 + (cam[2] - center.z) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    minID = id;
                }
            }
            this.startPanoramaLoading(minID);
        }

        // check if there are too many points
        if (this.pointsInMemory > this.pointLoadingBudgets.softMaximum) {
            console.log('!!! cleanup, in memory:', this.pointsInMemory, 'max:', this.pointLoadingBudgets.softMaximum);
            // do a serious cleanup:
            // remove nodes until remaining points are below unload threshold OR all nodes are within qualityDist
            const min = this.pointLoadingBudgets.softMinimum;
            const max = this.pointLoadingBudgets.softMaximum;
            const unloadThreshold = min + (max - min) / 2;

            // get all distances
            const dists: Array<[DynamicStreetViewNode, number]>
                = [...this.streetViewNodes.values()].map(node => [node, this.nodeCameraDistance(node)]);
            // sort them
            dists.sort((a, b) => b[1] - a[1]);

            // remove nodes starting with the most distant ones until there are not too many points or all nodes are within distance
            for (const [node, dist] of dists) {
                if (dist <= this.qualityDist * this.loadingDistFactor || this.pointsInMemory < unloadThreshold) {
                    break;
                }
                this.unloadNode(node);
            }
        }

        return stats;
    }

}
