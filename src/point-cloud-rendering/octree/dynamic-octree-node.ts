/**
 * DynamicOctreeNode allows to add points into it.
 *
 * Once maximal capacity is reached, the node is expanded into 8 new child nodes.
 * All points are distributed among child nodes.
 * The parent node also keeps all the points inserted before expansion.
 *
 */
export class DynamicOctreeNode {

    private readonly centerX: number;
    private readonly centerY: number;
    private readonly centerZ: number;

    private readonly pointPositions: Float32Array;
    private readonly pointColors: Float32Array;
    private readonly pointNormals: Float32Array;
    private pointNumber: number = 0;
    private children: Array<DynamicOctreeNode> = [];

    constructor(
        public readonly nodePosition: [number, number, number],
        public readonly nodeSize: number,
        public readonly pointLimit: number,
        public readonly remainingDepth: number,
    ) {
        this.centerX = nodePosition[0] + nodeSize / 2;
        this.centerY = nodePosition[1] + nodeSize / 2;
        this.centerZ = nodePosition[2] + nodeSize / 2;

        this.pointPositions = new Float32Array(pointLimit * 3);
        this.pointColors = new Float32Array(pointLimit * 3);
        this.pointNormals = new Float32Array(pointLimit * 3);
    }

    addPoint(pointIndex: number, positions: Float32Array, colors: Float32Array, normals: Float32Array) {
        if (this.pointNumber < this.pointLimit) {
            // insert locally
            const source = pointIndex * 3;
            const target = this.pointNumber * 3;
            for (let i = 0; i < 3; i++) {
                this.pointPositions[target + i] = positions[source + i];
                this.pointColors[target + i] = colors[source + i];
                this.pointNormals[target + i] = normals[source + i];
            }
            this.pointNumber++;
            return;
        }

        if (this.pointNumber === this.pointLimit) {
            if (this.remainingDepth <= 0) {
                console.warn('node is full and depth limit is reached, losing points');
                return;
            }
            // create children and move all points into them
            this.initChildren();
        }
        this.insertIntoChildren(pointIndex, positions, colors, normals);
        this.pointNumber++;
    }


    private insertIntoChildren(pointIndex: number, positions: Float32Array, colors: Float32Array, normals: Float32Array) {
        const x = positions[pointIndex * 3] > this.centerX ? 1 : 0;
        const y = positions[pointIndex * 3 + 1] > this.centerY ? 1 : 0;
        const z = positions[pointIndex * 3 + 2] > this.centerZ ? 1 : 0;
        const childID = DynamicOctreeNode.getChildIndex(x, y, z);
        this.children[childID].addPoint(pointIndex, positions, colors, normals);
    }

    private initChildren() {
        this.children = [];
        const childSize = this.nodeSize / 2;
        for (let z = 0; z < 2; z++) {
            for (let y = 0; y < 2; y++) {
                for (let x = 0; x < 2; x++) {
                    const newX = this.nodePosition[0] + childSize * x;
                    const newY = this.nodePosition[1] + childSize * y;
                    const newZ = this.nodePosition[2] + childSize * z;
                    const childID = DynamicOctreeNode.getChildIndex(x, y, z);
                    this.children[childID] = new DynamicOctreeNode([newX, newY, newZ], childSize, this.pointLimit, this.remainingDepth - 1);
                }
            }
        }
        for (let i = 0; i < this.pointNumber; i++) {
            this.insertIntoChildren(i, this.pointPositions, this.pointColors, this.pointNormals);
        }
    }

    private static getChildIndex(x: number, y: number, z: number): number {
        return x + y * 2 + z * 4;
    }

}
