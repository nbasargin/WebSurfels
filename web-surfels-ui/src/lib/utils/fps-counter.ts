export class FpsCounter {

    private readonly durations: Float32Array;
    private durationSum = 0;
    private nextPos = 0;
    private frames = 0;

    constructor(numFrames: number) {
        this.durations = new Float32Array(numFrames);
    }

    addDuration(duration: number) {
        this.frames++;
        const prevDuration = this.durations[this.nextPos];
        this.durationSum += duration - prevDuration;
        this.durations[this.nextPos] = duration;
        this.nextPos = (this.nextPos + 1) % this.durations.length;
    }

    getAvgDuration() {
        return this.durationSum / Math.min(this.durations.length, this.frames);
    }

}
