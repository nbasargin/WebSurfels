export class StaticOctreeNode {

    constructor(
        public readonly nodePosition: [number, number, number],
        public readonly nodeSize: number,
        public readonly pointPositions: Float32Array,
        public readonly pointColors: Float32Array,
        public readonly pointNormals: Float32Array,
        public readonly children: Array<StaticOctreeNode>
    ) {
    }

}
