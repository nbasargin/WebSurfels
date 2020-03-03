import { vec3 } from 'gl-matrix';

export class Plane2 {

    public nx: number;
    public ny: number;
    public nz: number;
    public d: number;

    setNormalAndPoint(normal: vec3, point: vec3) {
        this.nx = normal[0];
        this.ny = normal[1];
        this.nz = normal[2];
        this.d = -vec3.dot(normal, point);
    }

    pointDistance(x: number, y: number, z: number): number {
        return this.nx * x + this.ny * y + this.nz * z + this.d;
    }

}
