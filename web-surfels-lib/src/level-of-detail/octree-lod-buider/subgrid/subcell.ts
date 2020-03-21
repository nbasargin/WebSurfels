export class Subcell {

    /**
     * Compute cell index along one dimension.
     * @param pos  position of the point
     * @param bbMin   minimal position of the bounding box
     * @param bbSize  bounding box size
     * @param resolution  number of cells in the bounding box (along one side)
     * @param randomness  adds some randomness to indices (points could move to adjacent cells)
     */
    public static getCellIndex(pos: number, bbMin: number, bbSize: number, resolution: number, randomness: number = 0) {
        const rndOffset = randomness > 0 ? (Math.random() - 0.5) * randomness : 0;
        const index = Math.floor((pos - bbMin) / bbSize * resolution + rndOffset);
        return Math.max(0, Math.min(resolution - 1, index));
    }
}
