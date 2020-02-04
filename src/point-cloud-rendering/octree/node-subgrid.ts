export type SubgridCell = {positions: Array<number>, sizes: Array<number>, colors: Array<number>, normals: Array<number>, weights: Array<number>};

export class NodeSubgrid {

    grid: Array<SubgridCell>;

    constructor(public readonly resolution: number = 64) {
        this.grid = [];
        const length = resolution ** 3;
        for (let i = 0; i < length; i++) {
            this.grid[i] = {
                positions: [],
                sizes: [],
                colors: [],
                normals: [],
                weights: []
            }
        }
    }

    clear() {
        const length = this.resolution ** 3;
        for (let i = 0; i < length; i++) {
            if (this.grid[i].positions.length > 0) {
                this.grid[i].positions = [];
                this.grid[i].sizes = [];
                this.grid[i].colors = [];
                this.grid[i].normals = [];
                this.grid[i].weights = [];
            }
        }
    }

}
