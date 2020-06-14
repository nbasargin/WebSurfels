import { RenderingStats } from 'web-surfels';
import { BenchmarkData } from './benchmark-data';
import { CameraPath } from './camera-path';

export class Benchmark {

    data: BenchmarkData | null = null;
    running: boolean = false;

    constructor(public cameraPath: CameraPath) {

    }

    startBenchmark() {
        this.running = true;
        this.data = new BenchmarkData();
    }

    exportBenchmarkResults() {
        if (!this.data) {
            return;
        }
        this.data.exportData();
        this.data = null;
    }

    record(msPassed: number, stats: RenderingStats) {
        if (!this.running || !this.data) {
            return;
        }
        this.data.record(msPassed, stats);

        const framesBetweenTwoCamPoints = 200;
        const frame = this.data.frameDurations.length;
        if (frame >= this.cameraPath.points.length * framesBetweenTwoCamPoints) {
            this.running = false;
            return;
        }

        // next cam position
        const pointID = Math.floor(frame / framesBetweenTwoCamPoints);
        const progress = (frame - pointID * framesBetweenTwoCamPoints) / framesBetweenTwoCamPoints;
        this.cameraPath.setCameraPosition(pointID, progress);
    }
}
