export class FpsCounter {

    private readonly durations: Float32Array;
    private durationSum = 0;
    private nextPos = 0;

    constructor(numFrames: number) {
        this.durations = new Float32Array(numFrames);
    }

    addDuration(duration: number) {
        const prevDuration = this.durations[this.nextPos];
        this.durationSum += duration - prevDuration;
        this.durations[this.nextPos] = duration;
        this.nextPos = (this.nextPos + 1) % this.durations.length;
    }

    getAvgDuration() {
        return this.durationSum / this.durations.length;
    }

}
