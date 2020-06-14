import { RenderingStats } from 'web-surfels/lib/renderer/rendering-stats';

export class BenchmarkData {

    frameDurations: Array<number> = [];
    avgFPS: Array<number> = [];
    pointsRendered: Array<number> = [];
    pointsLoaded: Array<number> = [];
    nodesRendered: Array<number> = [];
    nodesLoaded: Array<number> = [];

    constructor(public avgFpsWindow: number = 5) {
    }

    record(msPassed: number, stats: RenderingStats) {
        this.frameDurations.push(msPassed);
        this.pointsRendered.push(stats.pointsDrawn);
        this.pointsLoaded.push(stats.pointsLoaded);
        this.nodesRendered.push(stats.nodesDrawn);
        this.nodesLoaded.push(stats.nodesLoaded);

        const windowSize = Math.min(this.avgFpsWindow, this.frameDurations.length);
        let summedDurations = 0;
        for (let i = 0; i < windowSize; i++) {
            summedDurations += this.frameDurations[this.frameDurations.length - 1 - i];
        }
        this.avgFPS.push(1000 / (summedDurations / windowSize));
    }

    exportData() {
        const csvRows: Array<string> = ['frameDurations, avgFPS, pointsRendered, nodesRendered, pointsLoaded, nodesLoaded'];
        for (let i = 0; i < this.frameDurations.length; i++) {
            csvRows.push(this.frameDurations[i] + ', ' + this.avgFPS[i] + ', ' + this.pointsRendered[i] + ', '
                + this.nodesRendered[i] + ', ' + this.pointsLoaded[i] + ', ' + this.nodesLoaded[i]);
        }
        const data = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        window.open(encodeURI(data), '_blank');
    }

}
