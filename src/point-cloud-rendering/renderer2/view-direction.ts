import { vec3 } from 'gl-matrix';

export class ViewDirection {

    public readonly direction: vec3;
    public readonly up: vec3;

    constructor(public readonly zIsUp: boolean) {
        this.direction = vec3.create();
        if (zIsUp) {
            this.up = vec3.fromValues(0, 0, 1);
        } else {
            this.up = vec3.fromValues(0, 1, 0);
        }
    }

    public update(angleX: number, angleY: number) {
        if (this.zIsUp) {
            vec3.set(this.direction, 0, -1, 0);
            vec3.rotateX(this.direction, this.direction, vec3.create(), -angleY);
            vec3.rotateZ(this.direction, this.direction, vec3.create(), angleX);
        } else {
            vec3.set(this.direction, 0, 0, -1);
            vec3.rotateX(this.direction, this.direction, vec3.create(), angleY);
            vec3.rotateY(this.direction, this.direction, vec3.create(), angleX);
        }
    }

}
