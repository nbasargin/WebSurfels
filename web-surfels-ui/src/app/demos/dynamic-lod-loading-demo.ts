import { vec3 } from 'gl-matrix';
import { DynamicLodController } from '../../lib/controllers/dynamic-lod/dynamic-lod-controller';
import { XhrLodLoader } from '../../lib/data/level-of-detail/xhr-lod-loader';
import { OrbitAnimationController } from '../../lib/controllers/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export interface DynamicLodBenchmarkData {
    frameDurations: Array<number>;
    pointsRendered: Array<number>;
    pointsLoaded: Array<number>;
    nodesRendered: Array<number>;
    nodesLoaded: Array<number>;
}

export class DynamicLodLoadingDemo implements DemoBase {

    preferredMovementSpeed = 10;

    dynamicLod: DynamicLodController;
    initialSizeThreshold = 1.4;

    benchmark: DynamicLodBenchmarkData | null = null;

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,

    ) {
        this.renderer.camera.setUpVector(vec3.fromValues(0, 1, 0));

        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.elevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const loader = new XhrLodLoader('http://localhost:5000/');
        this.dynamicLod = new DynamicLodController(this.renderer, loader, this.initialSizeThreshold);
    }

    startBenchmark() {
        this.benchmark = {
            frameDurations: [],
            pointsRendered: [],
            pointsLoaded: [],
            nodesRendered: [],
            nodesLoaded: [],
        }
    }

    stopBenchmark() {
        if (!this.benchmark) {
            return;
        }

        const csvRows: Array<string> = ['frameDurations, pointsRendered, nodesRendered, pointsLoaded, nodesLoaded'];
        const b = this.benchmark;
        for (let i = 0; i < b.frameDurations.length; i++) {
            csvRows.push(b.frameDurations[i] + ', ' + b.pointsRendered[i] + ', '
                + b.nodesRendered[i] + ', ' + b.pointsLoaded[i] + ', ' + b.nodesLoaded[i]);
        }
        this.benchmark = null;

        const data = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        window.open(encodeURI(data), '_blank');
    }

    record(msPassed: number) {
        if (!this.benchmark) {
            return;
        }
        const stats = this.dynamicLod.stats;
        this.benchmark.frameDurations.push(msPassed);
        this.benchmark.pointsRendered.push(stats.renderedPoints);
        this.benchmark.pointsLoaded.push(stats.loadedPoints);
        this.benchmark.nodesRendered.push(stats.renderedNodes);
        this.benchmark.nodesLoaded.push(stats.loadedNodes);
    }

}
