import { vec3 } from 'gl-matrix';
import { Renderer2 } from '../renderer2/renderer2';

export class AnimatedCamera {

    private frame = 0;

    private pos: vec3 = vec3.create();
    private target: vec3 = vec3.fromValues(0, 0, 0);
    private up: vec3;

    constructor(public readonly zIsUp: boolean) {
        this.up = vec3.create();
        if (zIsUp) {
            this.up = vec3.fromValues(0, 0, 1);
        } else {
            this.up = vec3.fromValues(0, 1, 0);
        }
    }

    nextFrame(renderer: Renderer2) {
        this.frame++;
        const twoPi = Math.PI * 2;
        const dist = 120 * (1.2 + Math.cos(this.frame / 1200 * twoPi));
        const elevation = 10; // 4;

        const angle = this.frame / 700 * twoPi;
        const x = dist * Math.cos(angle);
        const y = dist * Math.sin(angle);

        if (this.zIsUp) {
            this.pos[0] = x;
            this.pos[1] = y;
            this.pos[2] = elevation;
        } else {
            this.pos[0] = x;
            this.pos[1] = elevation;
            this.pos[2] = y;
        }
        renderer.camera.setOrientation(this.pos, this.target, this.up);
    }

}
