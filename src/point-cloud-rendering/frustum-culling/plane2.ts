import { vec3 } from 'gl-matrix';

export class Plane2 {

    public readonly nx: number;
    public readonly ny: number;
    public readonly nz: number;
    public readonly d: number;

    constructor(normal: vec3, point: vec3) {
        this.nx = normal[0];
        this.ny = normal[1];
        this.nz = normal[2];
        this.d = -vec3.dot(normal, point);
    }

    pointDistance(x: number, y: number, z: number): number {
        return this.nx * x + this.ny * y + this.nz * z + this.d;
    }

}
