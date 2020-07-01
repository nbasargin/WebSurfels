import { RenderingStats } from 'web-surfels';
import { BenchmarkData } from './benchmark-data';
import { CameraPath } from './camera-path';

export class Benchmark {

    data: BenchmarkData | null = null;
    running: boolean = false;
    framesBetweenTwoCamPoints = 200;

    constructor(public cameraPath: CameraPath) {

    }

    startBenchmark() {
        this.running = true;
        this.data = new BenchmarkData();
    }

    abortBenchmark() {
        this.running = false;
    }

    exportBenchmarkResults() {
        if (!this.data) {
            return;
        }
        this.data.exportData();
        // this.data = null;
    }

    record(msPassed: number, stats: RenderingStats) {
        if (!this.running || !this.data) {
            return;
        }
        this.data.record(msPassed, stats);

        const frame = this.data.frameDurations.length;
        if (frame >= this.cameraPath.points.length * this.framesBetweenTwoCamPoints) {
            this.running = false;
            return;
        }

        // next cam position
        const pointID = Math.floor(frame / this.framesBetweenTwoCamPoints);
        const progress = (frame - pointID * this.framesBetweenTwoCamPoints) / this.framesBetweenTwoCamPoints;
        this.cameraPath.setCameraPosition(pointID, progress);
    }

    getProgress(): number {
        if (!this.data) {
            return 0;
        }
        const frame = this.data.frameDurations.length;
        return frame / this.framesBetweenTwoCamPoints;
    }
}
