import { vec3 } from 'gl-matrix';
import { DynamicLodController } from '../../lib/controllers/dynamic-lod/dynamic-lod-controller';
import { XhrLodLoader } from '../../lib/data/level-of-detail/xhr-lod-loader';
import { OrbitAnimationController } from '../../lib/controllers/camera/orbit-animation-controller';
import { Renderer } from '../../lib/renderer/renderer';
import { DemoBase } from './demo-base';

export interface DynamicLodBenchmarkData {
    frameDurations: Array<number>;
    avgFPS: Array<number>;
    pointsRendered: Array<number>;
    pointsLoaded: Array<number>;
    nodesRendered: Array<number>;
    nodesLoaded: Array<number>;
}

export class DynamicLodLoadingDemo implements DemoBase {

    preferredMovementSpeed = 10;

    dynamicLod: DynamicLodController;
    initialSizeThreshold = 1.4;

    benchmarkResults: DynamicLodBenchmarkData | null = null;
    benchmarkRunning: boolean = false;

    cameraPoints: Array<{pos: vec3, viewDirection: vec3}> = [
        {
            pos: vec3.fromValues(-123.87712097167969, 40.665348052978516, 130.97201538085938),
            viewDirection: vec3.fromValues(0.5519500970840454, -0.29570692777633667, -0.779684841632843)
        },
        {
            pos: vec3.fromValues(-73.01689147949219, -1.5608155727386475, 22.44899559020996),
            viewDirection: vec3.fromValues( 0.9303686022758484, -0.21983617544174194, -0.29340478777885437)
        },
        {
            pos: vec3.fromValues(-26.93488883972168, -11.340331077575684, 9.762529373168945),
            viewDirection: vec3.fromValues(0.9359492063522339, 0.2806718647480011, -0.21265564858913422)
        },
        {
            pos: vec3.fromValues(54.45912170410156, 5.940879821777344, -11.91900634765625),
            viewDirection: vec3.fromValues(-0.7393689751625061, -0.08367259055376053, 0.6680811047554016)
        },
        {
            pos: vec3.fromValues(111.23981475830078, 52.36388397216797, -50.063785552978516),
            viewDirection: vec3.fromValues(-0.6645565032958984, -0.5060217976570129, 0.5498241186141968)
        },

    ];

    constructor(
        public renderer: Renderer,
        private orbitAnimation: OrbitAnimationController,

    ) {
        this.renderer.camera.setUpVector(vec3.fromValues(0, 1, 0));

        this.orbitAnimation.minDistance = 30;
        this.orbitAnimation.maxDistance = 100;
        this.orbitAnimation.cameraElevation = 30;
        this.orbitAnimation.rotationDuration = 15000 * this.preferredMovementSpeed;

        this.orbitAnimation.animate(0);

        const loader = new XhrLodLoader('http://localhost:5000/');
        this.dynamicLod = new DynamicLodController(this.renderer, loader, this.initialSizeThreshold, {strategy: 'nthFrame', unloadThreshold: 100, nthFrame: 50});
    }

    setCameraPosition(startPointID: number, progress: number = 0) {
        const endPointID = Math.min(startPointID + 1, this.cameraPoints.length - 1);
        const start = this.cameraPoints[startPointID];
        const end = this.cameraPoints[endPointID];

        const pos = vec3.create();
        vec3.scaleAndAdd(pos, pos, start.pos, 1 - progress);
        vec3.scaleAndAdd(pos, pos, end.pos, progress);

        const viewDirection = vec3.create();
        vec3.scaleAndAdd(viewDirection, viewDirection, start.viewDirection, 1 - progress);
        vec3.scaleAndAdd(viewDirection, viewDirection, end.viewDirection, progress);

        const target = vec3.create();
        vec3.add(target, pos, viewDirection);

        const cam = this.renderer.camera;
        cam.setOrientation(pos, target, cam.up);
    }

    startBenchmark() {
        this.benchmarkRunning = true;
        this.benchmarkResults = {
            frameDurations: [],
            avgFPS: [],
            pointsRendered: [],
            pointsLoaded: [],
            nodesRendered: [],
            nodesLoaded: [],
        }
    }

    exportBenchmarkResults() {
        if (!this.benchmarkResults) {
            return;
        }

        const csvRows: Array<string> = ['frameDurations, avgFPS, pointsRendered, nodesRendered, pointsLoaded, nodesLoaded'];
        const b = this.benchmarkResults;
        for (let i = 0; i < b.frameDurations.length; i++) {
            csvRows.push(b.frameDurations[i] + ', ' + b.avgFPS[i] + ', ' + b.pointsRendered[i] + ', '
                + b.nodesRendered[i] + ', ' + b.pointsLoaded[i] + ', ' + b.nodesLoaded[i]);
        }
        this.benchmarkResults = null;

        const data = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        window.open(encodeURI(data), '_blank');
    }

    record(msPassed: number) {
        if (!this.benchmarkRunning || !this.benchmarkResults) {
            return;
        }
        const stats = this.dynamicLod.stats;
        this.benchmarkResults.frameDurations.push(msPassed);
        this.benchmarkResults.pointsRendered.push(stats.pointsDrawn);
        this.benchmarkResults.pointsLoaded.push(stats.pointsLoaded);
        this.benchmarkResults.nodesRendered.push(stats.nodesDrawn);
        this.benchmarkResults.nodesLoaded.push(stats.nodesLoaded);

        const durations = this.benchmarkResults.frameDurations;
        const windowSize = Math.min(5, durations.length);
        let summedDurations = 0;
        for (let i = 0; i < windowSize; i++) {
            summedDurations += durations[durations.length - 1 - i];
        }
        this.benchmarkResults.avgFPS.push(1000 / (summedDurations / windowSize));

        const framesBetweenTwoCamPoints = 200;

        const frame = this.benchmarkResults.frameDurations.length;
        if (frame >= this.cameraPoints.length * framesBetweenTwoCamPoints) {
            this.benchmarkRunning = false;
        }

        // next cam position
        const pointID = Math.floor(frame / framesBetweenTwoCamPoints);
        const progress = (frame - pointID * framesBetweenTwoCamPoints) / framesBetweenTwoCamPoints;
        this.setCameraPosition(pointID, progress);
    }


}
