export class Subcell {

    public static getCellIndex(pos, min, size, resolution) {
        const index = Math.floor((pos - min) / size * resolution);
        return Math.max(0, Math.min(resolution - 1, index));
    }

    // adds some randomness to indices (points could move to adjacent cells)
    public static getRandomizedCellIndex(pos, min, size, resolution, randomness) {
        const index = Math.floor((pos - min) / size * resolution  + (Math.random() - 0.5) * randomness);
        return Math.max(0, Math.min(resolution - 1, index));
    }
}
